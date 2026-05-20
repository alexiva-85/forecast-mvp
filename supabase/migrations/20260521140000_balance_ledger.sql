-- E4: ledger баланса, резерв при выводе, сверка с profiles.balance

create table public.balance_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(18, 4) not null,
  balance_after numeric(18, 4) not null,
  kind text not null check (
    kind in (
      'opening_snapshot',
      'signup_grant',
      'withdrawal_hold',
      'withdrawal_release',
      'withdrawal_complete',
      'deposit',
      'admin_adjust'
    )
  ),
  withdrawal_request_id uuid references public.withdrawal_requests (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index balance_ledger_user_created_idx
  on public.balance_ledger (user_id, created_at desc);

create index balance_ledger_withdrawal_idx
  on public.balance_ledger (withdrawal_request_id)
  where withdrawal_request_id is not null;

alter table public.balance_ledger enable row level security;

create policy "balance_ledger read own" on public.balance_ledger
  for select using (auth.uid() = user_id);

revoke insert, update, delete on public.balance_ledger from anon, authenticated;

alter table public.admin_audit_log
  drop constraint if exists admin_audit_log_entity_type_check;

alter table public.admin_audit_log
  add constraint admin_audit_log_entity_type_check
  check (entity_type in ('market', 'platform', 'user', 'withdrawal'));

create or replace function public.apply_balance_ledger(
  p_user_id uuid,
  p_amount numeric,
  p_kind text,
  p_withdrawal_request_id uuid default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
  v_new_balance numeric;
  v_entry_id uuid;
begin
  if p_amount = 0 then
    raise exception 'Ledger amount cannot be zero';
  end if;

  select balance into v_balance
  from public.profiles
  where id = p_user_id
  for update;

  if v_balance is null then
    raise exception 'Profile not found';
  end if;

  v_new_balance := v_balance + p_amount;
  if v_new_balance < 0 then
    raise exception 'Insufficient balance';
  end if;

  update public.profiles
  set balance = v_new_balance
  where id = p_user_id;

  insert into public.balance_ledger (
    user_id,
    amount,
    balance_after,
    kind,
    withdrawal_request_id,
    note
  ) values (
    p_user_id,
    p_amount,
    v_new_balance,
    p_kind,
    p_withdrawal_request_id,
    nullif(trim(p_note), '')
  )
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

-- Снимок текущих балансов как стартовая точка ledger
insert into public.balance_ledger (user_id, amount, balance_after, kind, note)
select
  p.id,
  p.balance,
  p.balance,
  'opening_snapshot',
  'E4 migration snapshot'
from public.profiles p
where not exists (
  select 1 from public.balance_ledger l
  where l.user_id = p.id and l.kind = 'opening_snapshot'
);

-- Резерв по заявкам, созданным до ledger (E3 без списания)
do $$
declare
  r record;
begin
  for r in
    select w.id, w.user_id, w.amount
    from public.withdrawal_requests w
    where w.status in ('pending', 'approved')
      and not exists (
        select 1 from public.balance_ledger l
        where l.withdrawal_request_id = w.id
          and l.kind = 'withdrawal_hold'
      )
  loop
    begin
      perform public.apply_balance_ledger(
        r.user_id,
        -r.amount,
        'withdrawal_hold',
        r.id,
        'E4 backfill hold'
      );
    exception
      when others then
        update public.withdrawal_requests
        set status = 'cancelled',
            admin_note = coalesce(admin_note, '') || ' [auto: insufficient balance at E4]',
            updated_at = now()
        where id = r.id;
    end;
  end loop;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, balance)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    0
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

create or replace function public.submit_withdrawal_request(
  p_amount numeric,
  p_method text,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid;
  v_details text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.assert_rate_limit('withdrawal_request');

  if p_method not in ('bank', 'card', 'crypto') then
    raise exception 'Invalid withdrawal method';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid amount';
  end if;

  if p_amount > 1000000 then
    raise exception 'Amount too large';
  end if;

  v_details := nullif(trim(p_details), '');
  if v_details is not null and length(v_details) > 500 then
    raise exception 'Details too long';
  end if;

  insert into public.withdrawal_requests (user_id, amount, method, details)
  values (v_user_id, p_amount, p_method, v_details)
  returning id into v_request_id;

  perform public.apply_balance_ledger(
    v_user_id,
    -p_amount,
    'withdrawal_hold',
    v_request_id,
    format('Withdrawal hold %s', p_method)
  );

  return v_request_id;
exception
  when unique_violation then
    raise exception 'Withdrawal already pending';
end;
$$;

create or replace function public.cancel_my_withdrawal_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.withdrawal_requests%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row
  from public.withdrawal_requests
  where id = p_request_id and user_id = v_user_id
  for update;

  if v_row.id is null then
    raise exception 'Withdrawal not found';
  end if;

  if v_row.status <> 'pending' then
    raise exception 'Withdrawal cannot be cancelled';
  end if;

  update public.withdrawal_requests
  set status = 'cancelled', updated_at = now()
  where id = p_request_id;

  perform public.apply_balance_ledger(
    v_user_id,
    v_row.amount,
    'withdrawal_release',
    p_request_id,
    'Cancelled by user'
  );
end;
$$;

grant execute on function public.cancel_my_withdrawal_request(uuid) to authenticated;

create or replace function public.get_my_wallet_summary()
returns table (
  balance numeric,
  held numeric,
  available numeric,
  ledger_ok boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance numeric;
  v_held numeric;
  v_ledger_sum numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select p.balance into v_balance from public.profiles p where p.id = v_user_id;

  select coalesce(sum(w.amount), 0) into v_held
  from public.withdrawal_requests w
  where w.user_id = v_user_id
    and w.status in ('pending', 'approved');

  select coalesce(sum(l.amount), 0) into v_ledger_sum
  from public.balance_ledger l
  where l.user_id = v_user_id;

  return query
  select
    v_balance,
    v_held,
    v_balance as available,
    abs(v_balance - v_ledger_sum) < 0.0001 as ledger_ok;
end;
$$;

grant execute on function public.get_my_wallet_summary() to authenticated;

create or replace function public.admin_withdrawal_requests_list(
  p_status text default 'pending',
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  user_id uuid,
  user_email text,
  user_display_name text,
  amount numeric,
  method text,
  details text,
  status text,
  admin_note text,
  created_at timestamptz,
  reviewed_at timestamptz,
  reviewer_display_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select
    w.id,
    w.user_id,
    u.email::text as user_email,
    p.display_name as user_display_name,
    w.amount,
    w.method,
    w.details,
    w.status,
    w.admin_note,
    w.created_at,
    w.reviewed_at,
    rp.display_name as reviewer_display_name
  from public.withdrawal_requests w
  join public.profiles p on p.id = w.user_id
  left join auth.users u on u.id = w.user_id
  left join public.profiles rp on rp.id = w.reviewed_by
  where p_status = 'all' or w.status = p_status
  order by w.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

grant execute on function public.admin_withdrawal_requests_list(text, int, int)
  to authenticated;

create or replace function public.admin_review_withdrawal(
  p_request_id uuid,
  p_status text,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.withdrawal_requests%rowtype;
  v_note text;
  v_summary text;
  v_balance numeric;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_status not in ('approved', 'rejected', 'completed', 'cancelled') then
    raise exception 'Invalid status';
  end if;

  v_note := nullif(trim(p_admin_note), '');
  if v_note is not null and length(v_note) > 2000 then
    raise exception 'Admin note too long';
  end if;

  select * into v_row
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if v_row.id is null then
    raise exception 'Withdrawal not found';
  end if;

  if p_status = 'approved' and v_row.status <> 'pending' then
    raise exception 'Only pending withdrawals can be approved';
  end if;

  if p_status in ('rejected', 'cancelled')
    and v_row.status not in ('pending', 'approved') then
    raise exception 'Withdrawal cannot be rejected or cancelled';
  end if;

  if p_status = 'completed' and v_row.status not in ('pending', 'approved') then
    raise exception 'Withdrawal cannot be completed';
  end if;

  update public.withdrawal_requests
  set
    status = p_status,
    admin_note = coalesce(v_note, admin_note),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = p_request_id;

  if p_status in ('rejected', 'cancelled') then
    perform public.apply_balance_ledger(
      v_row.user_id,
      v_row.amount,
      'withdrawal_release',
      p_request_id,
      format('Withdrawal %s', p_status)
    );
  elsif p_status = 'completed' then
    select balance into v_balance from public.profiles where id = v_row.user_id;
    insert into public.balance_ledger (
      user_id,
      amount,
      balance_after,
      kind,
      withdrawal_request_id,
      note
    ) values (
      v_row.user_id,
      0,
      v_balance,
      'withdrawal_complete',
      p_request_id,
      'Withdrawal paid out'
    );
  end if;

  v_summary := format(
    'Вывод $%s → %s',
    trim(to_char(v_row.amount, '999999990.00')),
    p_status
  );

  perform public.log_admin_action(
    'withdrawal.' || p_status,
    'withdrawal',
    p_request_id,
    null,
    v_summary,
    jsonb_build_object(
      'user_id', v_row.user_id,
      'amount', v_row.amount,
      'method', v_row.method,
      'previous_status', v_row.status
    )
  );
end;
$$;

grant execute on function public.admin_review_withdrawal(uuid, text, text)
  to authenticated;

create or replace function public.admin_wallet_reconcile(
  p_user_id uuid default null
)
returns table (
  user_id uuid,
  profile_balance numeric,
  ledger_sum numeric,
  held_withdrawals numeric,
  matches boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select
    p.id as user_id,
    p.balance as profile_balance,
    coalesce(l.sum_amount, 0) as ledger_sum,
    coalesce(w.held, 0) as held_withdrawals,
    abs(p.balance - coalesce(l.sum_amount, 0)) < 0.0001 as matches
  from public.profiles p
  left join (
    select bl.user_id, sum(bl.amount) as sum_amount
    from public.balance_ledger bl
    group by bl.user_id
  ) l on l.user_id = p.id
  left join (
    select wr.user_id, sum(wr.amount) as held
    from public.withdrawal_requests wr
    where wr.status in ('pending', 'approved')
    group by wr.user_id
  ) w on w.user_id = p.id
  where p_user_id is null or p.id = p_user_id
  order by matches asc, p.id;
end;
$$;

grant execute on function public.admin_wallet_reconcile(uuid) to authenticated;

create or replace function public.admin_set_balance(
  p_user_id uuid,
  p_balance numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old numeric;
  v_delta numeric;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_balance is null or p_balance < 0 then
    raise exception 'Invalid balance';
  end if;

  select balance into v_old from public.profiles where id = p_user_id for update;
  if v_old is null then
    raise exception 'User not found';
  end if;

  v_delta := p_balance - v_old;
  if v_delta = 0 then
    return;
  end if;

  perform public.apply_balance_ledger(
    p_user_id,
    v_delta,
    'admin_adjust',
    null,
    format('Admin set balance %s → %s', v_old, p_balance)
  );

  perform public.log_admin_action(
    'user.set_balance',
    'user',
    p_user_id,
    null,
    format('Баланс: $%s → $%s', trim(to_char(v_old, '999999990.00')), trim(to_char(p_balance, '999999990.00'))),
    jsonb_build_object('old_balance', v_old, 'new_balance', p_balance)
  );
end;
$$;

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
        'admin_adjust'
      )
  ) u
  order by event_at desc
  limit v_limit;
end;
$$;
