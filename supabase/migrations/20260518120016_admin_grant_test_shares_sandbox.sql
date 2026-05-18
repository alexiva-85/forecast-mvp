-- При начислении тестовых долей помечаем рынок sandbox (если забыли при создании)

create or replace function public.admin_grant_test_shares(
  p_user_email text,
  p_market_slug text,
  p_outcome_key text,
  p_shares numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_market_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_shares is null or p_shares <= 0 or p_shares > 100000 then
    raise exception 'Invalid share amount';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(trim(p_user_email));

  if v_user_id is null then
    raise exception 'User not found';
  end if;

  select id into v_market_id
  from public.markets
  where slug = trim(p_market_slug);

  if v_market_id is null then
    raise exception 'Market not found';
  end if;

  update public.markets
  set is_sandbox = true
  where id = v_market_id and not is_sandbox;

  perform public.validate_market_outcome(v_market_id, trim(p_outcome_key));

  insert into public.positions (user_id, market_id, side, shares)
  values (v_user_id, v_market_id, trim(p_outcome_key), p_shares)
  on conflict (user_id, market_id, side)
  do update set shares = excluded.shares;
end;
$$;
