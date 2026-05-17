-- G2: per-user rate limits on trading RPCs

create table public.rate_limit_rules (
  action text primary key,
  max_requests integer not null check (max_requests > 0),
  window_seconds integer not null check (window_seconds > 0)
);

insert into public.rate_limit_rules (action, max_requests, window_seconds) values
  ('place_order', 30, 60),
  ('cancel_order', 60, 60),
  ('redeem_positions', 10, 60)
on conflict (action) do update set
  max_requests = excluded.max_requests,
  window_seconds = excluded.window_seconds;

create table public.rate_limit_counters (
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null references public.rate_limit_rules (action) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, action, window_start)
);

create index rate_limit_counters_window_idx
  on public.rate_limit_counters (window_start);

alter table public.rate_limit_counters enable row level security;
alter table public.rate_limit_rules enable row level security;

create policy "rate_limit_rules read all" on public.rate_limit_rules
  for select using (true);

revoke all on public.rate_limit_counters from anon, authenticated;

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
begin
  if v_user_id is null then
    return;
  end if;

  if public.is_admin() then
    return;
  end if;

  select * into v_rule from public.rate_limit_rules where action = p_action;
  if not found then
    return;
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / v_rule.window_seconds) * v_rule.window_seconds
  );

  insert into public.rate_limit_counters (user_id, action, window_start, request_count)
  values (v_user_id, p_action, v_window_start, 1)
  on conflict (user_id, action, window_start)
  do update set request_count = public.rate_limit_counters.request_count + 1
  returning request_count into v_count;

  if v_count > v_rule.max_requests then
    raise exception 'Rate limit exceeded';
  end if;
end;
$$;

-- Patch RPCs: call assert_rate_limit after auth check

create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.assert_rate_limit('cancel_order');

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.user_id <> v_user_id then
    raise exception 'Not your order';
  end if;

  if v_order.status <> 'open' then
    raise exception 'Order is not open';
  end if;

  update public.orders
  set status = 'cancelled'
  where id = p_order_id;
end;
$$;

create or replace function public.redeem_positions(p_market_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_market public.markets%rowtype;
  v_payout numeric := 0;
  v_winning_shares numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.assert_rate_limit('redeem_positions');

  select * into v_market from public.markets where id = p_market_id;
  if v_market.status <> 'resolved' or v_market.resolved_side is null then
    raise exception 'Market not resolved';
  end if;

  select coalesce(shares, 0) into v_winning_shares
  from public.positions
  where user_id = v_user_id
    and market_id = p_market_id
    and side = v_market.resolved_side;

  if v_winning_shares > 0 then
    v_payout := v_winning_shares;
    update public.profiles set balance = balance + v_payout where id = v_user_id;
    update public.positions set shares = 0
    where user_id = v_user_id and market_id = p_market_id and side = v_market.resolved_side;
  end if;

  update public.positions set shares = 0
  where user_id = v_user_id and market_id = p_market_id and side <> v_market.resolved_side;

  return v_payout;
end;
$$;

-- place_order: add rate limit + max size cap (anti-abuse)
create or replace function public.place_order(
  p_market_id uuid,
  p_side text,
  p_direction text,
  p_price numeric,
  p_size numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_market public.markets%rowtype;
  v_order_id uuid;
  v_remaining numeric := p_size;
  v_match record;
  v_trade_size numeric;
  v_fill_price numeric;
  v_fee_rate numeric;
  v_notional numeric;
  v_fee numeric;
  v_fee_half numeric;
  v_trade_id uuid;
  v_max_buyer_fee numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.assert_rate_limit('place_order');

  if p_size > 10000 then
    raise exception 'Order size too large';
  end if;

  v_fee_rate := public.get_trade_fee_rate();

  select * into v_market
  from public.markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Market not found';
  end if;

  if v_market.status = 'open'
    and v_market.closes_at is not null
    and v_market.closes_at <= now() then
    update public.markets set status = 'closed' where id = p_market_id;
    raise exception 'Trading closed';
  end if;

  if v_market.status <> 'open' then
    raise exception 'Market is not open for trading';
  end if;

  if p_side not in ('yes', 'no') or p_direction not in ('buy', 'sell') then
    raise exception 'Invalid side or direction';
  end if;
  if p_price <= 0 or p_price >= 1 or p_size <= 0 then
    raise exception 'Invalid price or size';
  end if;

  if p_direction = 'sell' then
    if coalesce(
      (select shares from public.positions
       where user_id = v_user_id and market_id = p_market_id and side = p_side),
      0
    ) < p_size then
      raise exception 'Insufficient shares';
    end if;
  else
    v_max_buyer_fee := round(p_price * p_size * v_fee_rate / 2, 4);
    if (select balance from public.profiles where id = v_user_id)
       < p_price * p_size + v_max_buyer_fee then
      raise exception 'Insufficient balance';
    end if;
    update public.profiles
    set balance = balance - (p_price * p_size)
    where id = v_user_id;
  end if;

  insert into public.orders (user_id, market_id, side, direction, price, size, remaining)
  values (v_user_id, p_market_id, p_side, p_direction, p_price, p_size, p_size)
  returning id into v_order_id;

  if p_direction = 'buy' then
    for v_match in
      select * from public.orders
      where market_id = p_market_id
        and side = p_side
        and direction = 'sell'
        and status = 'open'
        and user_id <> v_user_id
        and price <= p_price
      order by price asc, created_at asc
      for update
    loop
      exit when v_remaining <= 0;
      v_trade_size := least(v_remaining, v_match.remaining);
      v_fill_price := v_match.price;
      v_notional := v_fill_price * v_trade_size;
      v_fee := round(v_notional * v_fee_rate, 4);
      v_fee_half := v_fee / 2;

      update public.profiles
      set balance = balance + (v_fill_price * v_trade_size) - v_fee_half
      where id = v_match.user_id;

      update public.profiles
      set balance = balance + ((p_price - v_fill_price) * v_trade_size) - v_fee_half
      where id = v_user_id;

      perform public.add_position_shares(v_user_id, p_market_id, p_side, v_trade_size);
      perform public.add_position_shares(v_match.user_id, p_market_id, p_side, -v_trade_size);

      insert into public.trades (
        market_id, side, price, size, buyer_id, seller_id,
        buy_order_id, sell_order_id, fee_amount
      ) values (
        p_market_id, p_side, v_fill_price, v_trade_size,
        v_user_id, v_match.user_id, v_order_id, v_match.id, v_fee
      )
      returning id into v_trade_id;

      update public.platform_settings
      set fee_balance = fee_balance + v_fee, updated_at = now()
      where id = 1;

      update public.orders
      set remaining = remaining - v_trade_size,
          status = case when remaining - v_trade_size <= 0 then 'filled' else status end
      where id = v_match.id;

      v_remaining := v_remaining - v_trade_size;
    end loop;

    if v_remaining > 0 then
      update public.profiles
      set balance = balance + (p_price * v_remaining)
      where id = v_user_id;
    end if;
  else
    for v_match in
      select * from public.orders
      where market_id = p_market_id
        and side = p_side
        and direction = 'buy'
        and status = 'open'
        and user_id <> v_user_id
        and price >= p_price
      order by price desc, created_at asc
      for update
    loop
      exit when v_remaining <= 0;
      v_trade_size := least(v_remaining, v_match.remaining);
      v_fill_price := v_match.price;
      v_notional := v_fill_price * v_trade_size;
      v_fee := round(v_notional * v_fee_rate, 4);
      v_fee_half := v_fee / 2;

      update public.profiles
      set balance = balance + (v_fill_price * v_trade_size) - v_fee_half
      where id = v_user_id;

      update public.profiles
      set balance = balance - v_fee_half
      where id = v_match.user_id;

      perform public.add_position_shares(v_user_id, p_market_id, p_side, -v_trade_size);
      perform public.add_position_shares(v_match.user_id, p_market_id, p_side, v_trade_size);

      insert into public.trades (
        market_id, side, price, size, buyer_id, seller_id,
        buy_order_id, sell_order_id, fee_amount
      ) values (
        p_market_id, p_side, v_fill_price, v_trade_size,
        v_match.user_id, v_user_id, v_match.id, v_order_id, v_fee
      )
      returning id into v_trade_id;

      update public.platform_settings
      set fee_balance = fee_balance + v_fee, updated_at = now()
      where id = 1;

      update public.orders
      set remaining = remaining - v_trade_size,
          status = case when remaining - v_trade_size <= 0 then 'filled' else status end
      where id = v_match.id;

      v_remaining := v_remaining - v_trade_size;
    end loop;
  end if;

  update public.orders
  set remaining = greatest(v_remaining, 0),
      status = case when v_remaining <= 0 then 'filled' else 'open' end
  where id = v_order_id;

  return v_order_id;
end;
$$;
