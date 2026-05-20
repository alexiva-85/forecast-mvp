-- Restore assert_rate_limit side effects dropped in 20260521200000_mm_bot.sql

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

  if public.is_admin() or public.is_mm_bot() then
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
