-- F2: реферальная программа (тестовые бонусы через balance_ledger)

alter table public.profiles
  add column if not exists referral_code text;

create unique index if not exists profiles_referral_code_idx
  on public.profiles (referral_code)
  where referral_code is not null;

create table public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  referred_user_id uuid not null unique references public.profiles (id) on delete cascade,
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referral_code text not null,
  referrer_bonus_ledger_id uuid references public.balance_ledger (id) on delete set null,
  referee_bonus_ledger_id uuid references public.balance_ledger (id) on delete set null,
  created_at timestamptz not null default now(),
  check (referred_user_id <> referrer_id)
);

create index referral_attributions_referrer_idx
  on public.referral_attributions (referrer_id, created_at desc);

alter table public.referral_attributions enable row level security;

create policy "referral_attributions read own as referrer" on public.referral_attributions
  for select using (auth.uid() = referrer_id);

create policy "referral_attributions read own as referred" on public.referral_attributions
  for select using (auth.uid() = referred_user_id);

revoke insert, update, delete on public.referral_attributions from anon, authenticated;

alter table public.balance_ledger
  drop constraint if exists balance_ledger_kind_check;

alter table public.balance_ledger
  add constraint balance_ledger_kind_check
  check (
    kind in (
      'opening_snapshot',
      'signup_grant',
      'withdrawal_hold',
      'withdrawal_release',
      'withdrawal_complete',
      'deposit',
      'admin_adjust',
      'referral_bonus'
    )
  );

insert into public.rate_limit_rules (action, max_requests, window_seconds) values
  ('apply_referral', 5, 3600)
on conflict (action) do update set
  max_requests = excluded.max_requests,
  window_seconds = excluded.window_seconds;

create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  v_code text;
  v_attempt int := 0;
begin
  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 50 then
      raise exception 'Could not generate referral code';
    end if;
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
    exit when not exists (
      select 1 from public.profiles p where p.referral_code = v_code
    );
  end loop;
  return v_code;
end;
$$;

do $$
declare
  r record;
begin
  for r in select id from public.profiles where referral_code is null loop
    update public.profiles
    set referral_code = public.generate_referral_code()
    where id = r.id;
  end loop;
end;
$$;

alter table public.profiles
  alter column referral_code set not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  v_code := public.generate_referral_code();

  insert into public.profiles (id, display_name, balance, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    0,
    v_code
  );

  perform public.apply_balance_ledger(
    new.id,
    10000,
    'signup_grant',
    null,
    'Welcome bonus'
  );

  return new;
end;
$$;

create or replace function public.normalize_referral_code(p_code text)
returns text
language sql
immutable
as $$
  select upper(trim(p_code));
$$;

create or replace function public.apply_referral_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_referrer_id uuid;
  v_profile public.profiles%rowtype;
  v_referrer_ledger uuid;
  v_referee_ledger uuid;
  v_bonus numeric := 500;
  v_window interval := interval '7 days';
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.assert_rate_limit('apply_referral');

  v_code := public.normalize_referral_code(p_code);
  if v_code is null or length(v_code) < 4 or length(v_code) > 16 then
    raise exception 'Invalid referral code';
  end if;

  if exists (
    select 1 from public.referral_attributions a
    where a.referred_user_id = v_user_id
  ) then
    raise exception 'Referral already applied';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if v_profile.id is null then
    raise exception 'Profile not found';
  end if;

  if v_profile.created_at < now() - v_window then
    raise exception 'Referral window expired';
  end if;

  select id into v_referrer_id
  from public.profiles
  where referral_code = v_code;

  if v_referrer_id is null then
    raise exception 'Referral code not found';
  end if;

  if v_referrer_id = v_user_id then
    raise exception 'Cannot use own referral code';
  end if;

  v_referrer_ledger := public.apply_balance_ledger(
    v_referrer_id,
    v_bonus,
    'referral_bonus',
    null,
    format('Referral bonus: %s', v_code)
  );

  v_referee_ledger := public.apply_balance_ledger(
    v_user_id,
    v_bonus,
    'referral_bonus',
    null,
    format('Welcome via %s', v_code)
  );

  insert into public.referral_attributions (
    referred_user_id,
    referrer_id,
    referral_code,
    referrer_bonus_ledger_id,
    referee_bonus_ledger_id
  ) values (
    v_user_id,
    v_referrer_id,
    v_code,
    v_referrer_ledger,
    v_referee_ledger
  );
end;
$$;

create or replace function public.get_my_referral_summary()
returns table (
  referral_code text,
  invited_count bigint,
  bonus_earned_usd numeric,
  can_apply_code boolean,
  referred_by_label text,
  applied_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_attr public.referral_attributions%rowtype;
  v_referrer_name text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;

  select * into v_attr
  from public.referral_attributions a
  where a.referred_user_id = v_user_id;

  if v_attr.id is not null then
    select coalesce(p.display_name, left(p.id::text, 8))
    into v_referrer_name
    from public.profiles p
    where p.id = v_attr.referrer_id;
  end if;

  return query
  select
    v_profile.referral_code,
    (
      select count(*)::bigint
      from public.referral_attributions a
      where a.referrer_id = v_user_id
    ),
    coalesce((
      select sum(bl.amount)
      from public.referral_attributions a
      join public.balance_ledger bl on bl.id = a.referrer_bonus_ledger_id
      where a.referrer_id = v_user_id
    ), 0)::numeric,
    (v_attr.id is null and v_profile.created_at >= now() - interval '7 days'),
    v_referrer_name,
    v_attr.created_at;
end;
$$;

create or replace function public.list_my_referrals(p_limit integer default 20)
returns table (
  referred_user_id uuid,
  display_label text,
  created_at timestamptz,
  bonus_usd numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select
    a.referred_user_id,
    coalesce(p.display_name, 'Пользователь') as display_label,
    a.created_at,
    coalesce(bl.amount, 0)::numeric as bonus_usd
  from public.referral_attributions a
  join public.profiles p on p.id = a.referred_user_id
  left join public.balance_ledger bl on bl.id = a.referrer_bonus_ledger_id
  where a.referrer_id = v_user_id
  order by a.created_at desc
  limit v_limit;
end;
$$;

grant execute on function public.apply_referral_code(text) to authenticated;
grant execute on function public.get_my_referral_summary() to authenticated;
grant execute on function public.list_my_referrals(integer) to authenticated;

create or replace function public.list_my_activity(p_limit integer default 100)
returns table (
  event_id text,
  event_at timestamptz,
  event_type text,
  market_slug text,
  market_title text,
  side text,
  direction text,
  price numeric,
  size numeric,
  amount numeric,
  fee numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 500);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select * from (
    select
      ('trade-' || t.id::text) as event_id,
      t.created_at as event_at,
      case when t.buyer_id = v_user_id then 'trade_buy' else 'trade_sell' end as event_type,
      m.slug as market_slug,
      m.title as market_title,
      t.side,
      case when t.buyer_id = v_user_id then 'buy' else 'sell' end as direction,
      t.price,
      t.size,
      case
        when t.buyer_id = v_user_id then
          -(t.price * t.size + coalesce(t.fee_amount, 0) / 2)
        else
          (t.price * t.size - coalesce(t.fee_amount, 0) / 2)
      end as amount,
      coalesce(t.fee_amount, 0) / 2 as fee
    from public.trades t
    join public.markets m on m.id = t.market_id
    where t.buyer_id = v_user_id or t.seller_id = v_user_id

    union all

    select
      ('order-' || o.id::text) as event_id,
      o.created_at as event_at,
      'order_cancelled' as event_type,
      m.slug,
      m.title,
      o.side,
      o.direction,
      o.price,
      o.size,
      null::numeric as amount,
      null::numeric as fee
    from public.orders o
    join public.markets m on m.id = o.market_id
    where o.user_id = v_user_id
      and o.status = 'cancelled'

    union all

    select
      ('redeem-' || e.id::text),
      e.created_at,
      'redeem',
      m.slug,
      m.title,
      null,
      null,
      null,
      null,
      e.amount,
      null
    from public.account_events e
    left join public.markets m on m.id = e.market_id
    where e.user_id = v_user_id

    union all

    select
      ('ledger-' || bl.id::text),
      bl.created_at,
      case bl.kind
        when 'withdrawal_hold' then 'withdrawal_hold'
        when 'withdrawal_release' then 'withdrawal_release'
        when 'withdrawal_complete' then 'withdrawal_complete'
        when 'deposit' then 'deposit'
        when 'referral_bonus' then 'referral_bonus'
        else 'wallet_adjust'
      end,
      null,
      coalesce(bl.note, bl.kind),
      null,
      null,
      null,
      null,
      bl.amount,
      null
    from public.balance_ledger bl
    where bl.user_id = v_user_id
      and bl.kind in (
        'withdrawal_hold',
        'withdrawal_release',
        'withdrawal_complete',
        'deposit',
        'admin_adjust',
        'referral_bonus'
      )
  ) u
  order by event_at desc
  limit v_limit;
end;
$$;
