-- A11 / D4: модерация пользователей, KYC-заготовка, персональный множитель лимитов

alter table public.profiles
  add column if not exists trading_blocked boolean not null default false,
  add column if not exists kyc_status text not null default 'none'
    check (kyc_status in ('none', 'pending', 'verified', 'rejected')),
  add column if not exists moderation_note text,
  add column if not exists rate_limit_multiplier numeric(6, 2) not null default 1.00
    check (rate_limit_multiplier > 0 and rate_limit_multiplier <= 10);

create index if not exists profiles_trading_blocked_idx
  on public.profiles (trading_blocked)
  where trading_blocked;

create or replace function public.assert_user_can_trade()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_blocked boolean;
begin
  if v_user_id is null then
    return;
  end if;

  select trading_blocked into v_blocked
  from public.profiles
  where id = v_user_id;

  if coalesce(v_blocked, false) then
    raise exception 'Trading suspended';
  end if;
end;
$$;

create or replace function public.assert_rate_limit(p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rule public.rate_limit_rules%rowtype;
  v_window_start timestamptz;
  v_count integer;
  v_multiplier numeric;
  v_effective_max integer;
begin
  if v_user_id is null then
    return;
  end if;

  perform public.assert_user_can_trade();

  if public.is_admin() then
    return;
  end if;

  select * into v_rule from public.rate_limit_rules where action = p_action;
  if not found then
    return;
  end if;

  select coalesce(p.rate_limit_multiplier, 1)
  into v_multiplier
  from public.profiles p
  where p.id = v_user_id;

  v_effective_max := greatest(1, floor(v_rule.max_requests * v_multiplier));

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / v_rule.window_seconds) * v_rule.window_seconds
  );

  insert into public.rate_limit_counters (user_id, action, window_start, request_count)
  values (v_user_id, p_action, v_window_start, 1)
  on conflict (user_id, action, window_start)
  do update set request_count = public.rate_limit_counters.request_count + 1
  returning request_count into v_count;

  if v_count > v_effective_max then
    raise exception 'Rate limit exceeded';
  end if;
end;
$$;

create or replace function public.admin_users_list(
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  email text,
  display_name text,
  balance numeric,
  is_admin boolean,
  trading_blocked boolean,
  kyc_status text,
  moderation_note text,
  rate_limit_multiplier numeric,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_search text := nullif(trim(p_search), '');
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.display_name,
    p.balance,
    p.is_admin,
    p.trading_blocked,
    p.kyc_status,
    p.moderation_note,
    p.rate_limit_multiplier,
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where
    v_search is null
    or lower(u.email) like '%' || lower(v_search) || '%'
    or lower(coalesce(p.display_name, '')) like '%' || lower(v_search) || '%'
    or p.id::text = v_search
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_update_user(
  p_user_id uuid,
  p_trading_blocked boolean,
  p_kyc_status text,
  p_moderation_note text default null,
  p_rate_limit_multiplier numeric default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_old record;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_kyc_status not in ('none', 'pending', 'verified', 'rejected') then
    raise exception 'Invalid KYC status';
  end if;

  if p_rate_limit_multiplier is null
    or p_rate_limit_multiplier <= 0
    or p_rate_limit_multiplier > 10
  then
    raise exception 'Invalid rate limit multiplier';
  end if;

  select trading_blocked, kyc_status, moderation_note, rate_limit_multiplier
  into v_old
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'User not found';
  end if;

  select email into v_email from auth.users where id = p_user_id;

  update public.profiles
  set
    trading_blocked = coalesce(p_trading_blocked, false),
    kyc_status = p_kyc_status,
    moderation_note = nullif(trim(p_moderation_note), ''),
    rate_limit_multiplier = p_rate_limit_multiplier
  where id = p_user_id;

  perform public.log_admin_action(
    'user.update',
    'user',
    p_user_id,
    v_email,
    format('Пользователь %s: модерация обновлена', coalesce(v_email, p_user_id::text)),
    jsonb_build_object(
      'trading_blocked', coalesce(p_trading_blocked, false),
      'kyc_status', p_kyc_status,
      'rate_limit_multiplier', p_rate_limit_multiplier,
      'was_trading_blocked', v_old.trading_blocked,
      'was_kyc_status', v_old.kyc_status,
      'was_rate_limit_multiplier', v_old.rate_limit_multiplier
    )
  );
end;
$$;

grant execute on function public.admin_users_list(text, int, int) to authenticated;
grant execute on function public.admin_update_user(uuid, boolean, text, text, numeric) to authenticated;
