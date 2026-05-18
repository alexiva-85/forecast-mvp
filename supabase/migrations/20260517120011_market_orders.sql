-- B4: market orders (FOK / IOC) — immediate execution, no resting liquidity

alter table public.orders
  add column if not exists order_kind text not null default 'limit'
    check (order_kind in ('limit', 'market'));

alter table public.orders
  add column if not exists time_in_force text not null default 'gtc'
    check (time_in_force in ('gtc', 'fok', 'ioc'));

create or replace function public.place_market_order(
  p_market_id uuid,
  p_side text,
  p_direction text,
  p_size numeric,
  p_time_in_force text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_market public.markets%rowtype;
  v_order_id uuid;
  v_remaining numeric := p_size;
  v_filled numeric := 0;
  v_match record;
  v_trade_size numeric;
  v_fill_price numeric;
  v_fee_rate numeric;
  v_notional numeric;
  v_fee numeric;
  v_fee_half numeric;
  v_trade_id uuid;
  v_max_buyer_fee numeric;
  v_worst_price constant numeric := 0.99;
  v_best_price constant numeric := 0.01;
  v_price numeric;
  v_available numeric;
  v_cost_sum numeric := 0;
  v_avg_price numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.assert_rate_limit('place_order');

  if p_time_in_force not in ('fok', 'ioc') then
    raise exception 'Invalid time in force';
  end if;

  if p_size <= 0 or p_size > 10000 then
    raise exception 'Order size too large';
  end if;

  if p_side not in ('yes', 'no') or p_direction not in ('buy', 'sell') then
    raise exception 'Invalid side or direction';
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

  v_price := case when p_direction = 'buy' then v_worst_price else v_best_price end;

  if p_time_in_force = 'fok' then
    if p_direction = 'buy' then
      select coalesce(sum(remaining), 0) into v_available
      from public.orders
      where market_id = p_market_id
        and side = p_side
        and direction = 'sell'
        and status = 'open'
        and user_id <> v_user_id;

      if v_available < p_size then
        raise exception 'Insufficient liquidity';
      end if;

      v_max_buyer_fee := round(v_worst_price * p_size * v_fee_rate / 2, 4);
      if (select balance from public.profiles where id = v_user_id)
         < v_worst_price * p_size + v_max_buyer_fee then
        raise exception 'Insufficient balance';
      end if;
    else
      select coalesce(sum(remaining), 0) into v_available
      from public.orders
      where market_id = p_market_id
        and side = p_side
        and direction = 'buy'
        and status = 'open'
        and user_id <> v_user_id;

      if v_available < p_size then
        raise exception 'Insufficient liquidity';
      end if;

      if coalesce(
        (select shares from public.positions
         where user_id = v_user_id and market_id = p_market_id and side = p_side),
        0
      ) < p_size then
        raise exception 'Insufficient shares';
      end if;
    end if;
  elsif p_direction = 'sell' then
    if coalesce(
      (select shares from public.positions
       where user_id = v_user_id and market_id = p_market_id and side = p_side),
      0
    ) < p_size then
      raise exception 'Insufficient shares';
    end if;
  else
    v_max_buyer_fee := round(v_worst_price * p_size * v_fee_rate / 2, 4);
    if (select balance from public.profiles where id = v_user_id)
       < v_worst_price * p_size + v_max_buyer_fee then
      raise exception 'Insufficient balance';
    end if;
  end if;

  if p_direction = 'buy' then
    update public.profiles
    set balance = balance - (v_worst_price * p_size)
    where id = v_user_id;
  end if;

  insert into public.orders (
    user_id, market_id, side, direction, price, size, remaining,
    order_kind, time_in_force
  )
  values (
    v_user_id, p_market_id, p_side, p_direction, v_price, p_size, p_size,
    'market', p_time_in_force
  )
  returning id into v_order_id;

  if p_direction = 'buy' then
    for v_match in
      select * from public.orders
      where market_id = p_market_id
        and side = p_side
        and direction = 'sell'
        and status = 'open'
        and user_id <> v_user_id
        and price <= v_worst_price
      order by price asc, created_at asc
      for update
    loop
      exit when v_remaining <= 0;
      v_trade_size := least(v_remaining, v_match.remaining);
      v_fill_price := v_match.price;
      v_notional := v_fill_price * v_trade_size;
      v_fee := round(v_notional * v_fee_rate, 4);
      v_fee_half := v_fee / 2;
      v_cost_sum := v_cost_sum + v_notional;

      update public.profiles
      set balance = balance + (v_fill_price * v_trade_size) - v_fee_half
      where id = v_match.user_id;

      update public.profiles
      set balance = balance + ((v_worst_price - v_fill_price) * v_trade_size) - v_fee_half
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

      v_filled := v_filled + v_trade_size;
      v_remaining := v_remaining - v_trade_size;
    end loop;

    if v_remaining > 0 then
      update public.profiles
      set balance = balance + (v_worst_price * v_remaining)
      where id = v_user_id;

      if p_time_in_force = 'fok' then
        raise exception 'Insufficient liquidity';
      end if;
    end if;
  else
    for v_match in
      select * from public.orders
      where market_id = p_market_id
        and side = p_side
        and direction = 'buy'
        and status = 'open'
        and user_id <> v_user_id
        and price >= v_best_price
      order by price desc, created_at asc
      for update
    loop
      exit when v_remaining <= 0;
      v_trade_size := least(v_remaining, v_match.remaining);
      v_fill_price := v_match.price;
      v_notional := v_fill_price * v_trade_size;
      v_fee := round(v_notional * v_fee_rate, 4);
      v_fee_half := v_fee / 2;
      v_cost_sum := v_cost_sum + v_notional;

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

      v_filled := v_filled + v_trade_size;
      v_remaining := v_remaining - v_trade_size;
    end loop;

    if v_remaining > 0 and p_time_in_force = 'fok' then
      raise exception 'Insufficient liquidity';
    end if;
  end if;

  v_avg_price := case
    when v_filled > 0 then round(v_cost_sum / v_filled, 4)
    else null
  end;

  update public.orders
  set remaining = 0,
      status = case when v_filled > 0 then 'filled' else 'cancelled' end
  where id = v_order_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'filled', v_filled,
    'requested', p_size,
    'avg_price', v_avg_price,
    'time_in_force', p_time_in_force
  );
end;
$$;

grant execute on function public.place_market_order(uuid, text, text, numeric, text)
  to authenticated;
