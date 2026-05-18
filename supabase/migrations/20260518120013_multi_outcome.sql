-- B7: multi-outcome markets (outcome_key + market_outcomes; neg-risk deferred)

create table public.market_outcomes (
  market_id uuid not null references public.markets (id) on delete cascade,
  outcome_key text not null,
  label text not null,
  sort_order smallint not null default 0,
  primary key (market_id, outcome_key),
  constraint market_outcomes_key_format check (outcome_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index market_outcomes_market_idx on public.market_outcomes (market_id, sort_order);

alter table public.markets
  add column if not exists outcome_mode text not null default 'binary'
    check (outcome_mode in ('binary', 'multi'));

alter table public.markets drop constraint if exists markets_resolved_side_check;

alter table public.orders drop constraint if exists orders_side_check;
alter table public.positions drop constraint if exists positions_side_check;
alter table public.trades drop constraint if exists trades_side_check;

insert into public.market_outcomes (market_id, outcome_key, label, sort_order)
select m.id, 'yes', 'Да', 0 from public.markets m
on conflict do nothing;

insert into public.market_outcomes (market_id, outcome_key, label, sort_order)
select m.id, 'no', 'Нет', 1 from public.markets m
on conflict do nothing;

alter table public.orders
  add constraint orders_market_outcome_fkey
  foreign key (market_id, side) references public.market_outcomes (market_id, outcome_key);

alter table public.positions
  add constraint positions_market_outcome_fkey
  foreign key (market_id, side) references public.market_outcomes (market_id, outcome_key);

alter table public.trades
  add constraint trades_market_outcome_fkey
  foreign key (market_id, side) references public.market_outcomes (market_id, outcome_key);

alter table public.markets
  add column if not exists resolved_outcome_key text;

update public.markets
set resolved_outcome_key = resolved_side
where resolved_side is not null and resolved_outcome_key is null;

alter table public.market_outcomes enable row level security;

create policy "market_outcomes read all" on public.market_outcomes
  for select using (true);

create or replace function public.validate_market_outcome(
  p_market_id uuid,
  p_outcome_key text
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.market_outcomes
    where market_id = p_market_id and outcome_key = p_outcome_key
  ) then
    raise exception 'Invalid outcome';
  end if;
end;
$$;

create or replace function public.seed_binary_market_outcomes(p_market_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.market_outcomes (market_id, outcome_key, label, sort_order)
  values
    (p_market_id, 'yes', 'Да', 0),
    (p_market_id, 'no', 'Нет', 1)
  on conflict do nothing;
end;
$$;

create or replace function public.seed_market_outcomes_from_json(
  p_market_id uuid,
  p_outcomes jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_key text;
  v_label text;
  v_order smallint := 0;
  v_count integer := 0;
begin
  if p_outcomes is null or jsonb_typeof(p_outcomes) <> 'array' then
    raise exception 'Outcomes must be a JSON array';
  end if;

  v_count := jsonb_array_length(p_outcomes);
  if v_count < 2 or v_count > 8 then
    raise exception 'Outcomes count must be between 2 and 8';
  end if;

  for v_item in select * from jsonb_array_elements(p_outcomes)
  loop
    v_key := lower(trim(both from v_item->>'key'));
    v_label := trim(both from v_item->>'label');
    if v_key is null or v_key !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
      raise exception 'Invalid outcome key';
    end if;
    if v_label is null or length(v_label) = 0 then
      raise exception 'Outcome label required';
    end if;
    insert into public.market_outcomes (market_id, outcome_key, label, sort_order)
    values (p_market_id, v_key, v_label, v_order)
    on conflict (market_id, outcome_key) do update
      set label = excluded.label, sort_order = excluded.sort_order;
    v_order := v_order + 1;
  end loop;
end;
$$;

create or replace function public.trg_seed_market_outcomes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_binary_market_outcomes(new.id);
  return new;
end;
$$;

drop trigger if exists markets_seed_outcomes on public.markets;
create trigger markets_seed_outcomes
  after insert on public.markets
  for each row execute function public.trg_seed_market_outcomes();



create or replace function public.admin_resolve_market(
  p_market_id uuid,
  p_side text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  perform public.validate_market_outcome(p_market_id, p_side);

  select status into v_status from public.markets where id = p_market_id;
  if v_status is null then
    raise exception 'Market not found';
  end if;
  if v_status <> 'closed' then
    raise exception 'Market must be closed before resolve';
  end if;

  update public.markets
  set status = 'resolved',
      resolved_side = p_side,
      resolved_outcome_key = p_side
  where id = p_market_id;

  update public.orders set status = 'cancelled'
  where market_id = p_market_id and status = 'open';
end;
$$;

create or replace function public.admin_create_market(
  p_slug text,
  p_title text,
  p_description text,
  p_category text,
  p_closes_at timestamptz,
  p_resolution_rules text,
  p_resolution_checklist jsonb,
  p_tags text[] default '{}'::text[],
  p_is_sandbox boolean default false,
  p_outcomes jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market_id uuid;
  v_tags text[];
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid slug';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'Title required';
  end if;

  if p_category not in ('sport', 'crypto') then
    raise exception 'Invalid category';
  end if;

  if p_resolution_rules is null or length(trim(p_resolution_rules)) = 0 then
    raise exception 'Resolution rules required';
  end if;

  if p_resolution_checklist is null
    or jsonb_typeof(p_resolution_checklist) <> 'array'
    or jsonb_array_length(p_resolution_checklist) = 0 then
    raise exception 'Resolution checklist required';
  end if;

  v_tags := public.normalize_market_tags(p_tags);
  if coalesce(array_length(v_tags, 1), 0) > 8 then
    raise exception 'Too many tags';
  end if;

  insert into public.markets (
    slug,
    title,
    description,
    category,
    closes_at,
    resolution_rules,
    resolution_checklist,
    tags,
    is_sandbox
  ) values (
    p_slug,
    trim(p_title),
    nullif(trim(p_description), ''),
    p_category,
    p_closes_at,
    trim(p_resolution_rules),
    p_resolution_checklist,
    v_tags,
    coalesce(p_is_sandbox, false)
  )
  returning id into v_market_id;

  if p_outcomes is not null and jsonb_array_length(p_outcomes) > 0 then
    delete from public.market_outcomes where market_id = v_market_id;
    perform public.seed_market_outcomes_from_json(v_market_id, p_outcomes);
    update public.markets set outcome_mode = 'multi' where id = v_market_id;
  else
    perform public.seed_binary_market_outcomes(v_market_id);
    update public.markets set outcome_mode = 'binary' where id = v_market_id;
  end if;

  return v_market_id;
end;
$$;

drop function if exists public.admin_create_market(
  text, text, text, text, timestamptz, text, jsonb, text[], boolean
);

grant execute on function public.admin_create_market(
  text, text, text, text, timestamptz, text, jsonb, text[], boolean, jsonb
) to authenticated;


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
  if v_market.status <> 'resolved' or coalesce(v_market.resolved_outcome_key, v_market.resolved_side) is null then
    raise exception 'Market not resolved';
  end if;

  select coalesce(shares, 0) into v_winning_shares
  from public.positions
  where user_id = v_user_id
    and market_id = p_market_id
    and side = coalesce(v_market.resolved_outcome_key, v_market.resolved_side);

  if v_winning_shares > 0 then
    v_payout := v_winning_shares;
    update public.profiles set balance = balance + v_payout where id = v_user_id;
    update public.positions set shares = 0
    where user_id = v_user_id and market_id = p_market_id and side = coalesce(v_market.resolved_outcome_key, v_market.resolved_side);

    insert into public.account_events (user_id, kind, market_id, amount)
    values (v_user_id, 'redeem', p_market_id, v_payout);
  end if;

  update public.positions set shares = 0
  where user_id = v_user_id and market_id = p_market_id and side <> coalesce(v_market.resolved_outcome_key, v_market.resolved_side);

  return v_payout;
end;
$$;

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

  if p_direction not in ('buy', 'sell') then
    raise exception 'Invalid direction';
  end if;
  perform public.validate_market_outcome(p_market_id, p_side);

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

  if p_direction not in ('buy', 'sell') then
    raise exception 'Invalid direction';
  end if;
  perform public.validate_market_outcome(p_market_id, p_side);

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