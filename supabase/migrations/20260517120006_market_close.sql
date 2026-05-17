-- C4: auto-close markets when closes_at passes; block new orders

create index if not exists markets_open_closes_at_idx
  on public.markets (closes_at)
  where status = 'open' and closes_at is not null;

create or replace function public.close_expired_markets()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.markets
  set status = 'closed'
  where status = 'open'
    and closes_at is not null
    and closes_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.close_expired_markets() to anon, authenticated;

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
