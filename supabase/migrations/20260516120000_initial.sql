-- Forecast MVP: virtual balances + limit order book

create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  balance numeric(18, 4) not null default 10000 check (balance >= 0),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.markets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  category text not null check (category in ('sport', 'crypto')),
  status text not null default 'open' check (status in ('open', 'closed', 'resolved')),
  resolved_side text check (resolved_side in ('yes', 'no')),
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  market_id uuid not null references public.markets (id) on delete cascade,
  side text not null check (side in ('yes', 'no')),
  direction text not null check (direction in ('buy', 'sell')),
  price numeric(6, 4) not null check (price > 0 and price < 1),
  size numeric(18, 4) not null check (size > 0),
  remaining numeric(18, 4) not null check (remaining > 0),
  status text not null default 'open' check (status in ('open', 'filled', 'cancelled')),
  created_at timestamptz not null default now()
);

create index orders_market_open_idx on public.orders (market_id, side, direction, price, created_at)
  where status = 'open';

create table public.positions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  market_id uuid not null references public.markets (id) on delete cascade,
  side text not null check (side in ('yes', 'no')),
  shares numeric(18, 4) not null default 0 check (shares >= 0),
  primary key (user_id, market_id, side)
);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets (id) on delete cascade,
  side text not null check (side in ('yes', 'no')),
  price numeric(6, 4) not null,
  size numeric(18, 4) not null,
  buyer_id uuid not null references public.profiles (id),
  seller_id uuid not null references public.profiles (id),
  buy_order_id uuid references public.orders (id),
  sell_order_id uuid references public.orders (id),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.markets enable row level security;
alter table public.orders enable row level security;
alter table public.positions enable row level security;
alter table public.trades enable row level security;

create policy "profiles read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles update own name" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "markets read all" on public.markets
  for select using (true);

create policy "orders read all" on public.orders
  for select using (status = 'open' or auth.uid() = user_id);

create policy "positions read own" on public.positions
  for select using (auth.uid() = user_id);

create policy "trades read all" on public.trades
  for select using (true);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.add_position_shares(
  p_user_id uuid,
  p_market_id uuid,
  p_side text,
  p_delta numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.positions (user_id, market_id, side, shares)
  values (p_user_id, p_market_id, p_side, greatest(p_delta, 0))
  on conflict (user_id, market_id, side)
  do update set shares = greatest(public.positions.shares + p_delta, 0);
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
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_market from public.markets where id = p_market_id;
  if not found then
    raise exception 'Market not found';
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
    if (select balance from public.profiles where id = v_user_id) < p_price * p_size then
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

      update public.profiles
      set balance = balance + (v_fill_price * v_trade_size)
      where id = v_match.user_id;

      update public.profiles
      set balance = balance + ((p_price - v_fill_price) * v_trade_size)
      where id = v_user_id;

      perform public.add_position_shares(v_user_id, p_market_id, p_side, v_trade_size);
      perform public.add_position_shares(v_match.user_id, p_market_id, p_side, -v_trade_size);

      insert into public.trades (
        market_id, side, price, size, buyer_id, seller_id, buy_order_id, sell_order_id
      ) values (
        p_market_id, p_side, v_fill_price, v_trade_size,
        v_user_id, v_match.user_id, v_order_id, v_match.id
      );

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

      update public.profiles
      set balance = balance + (v_fill_price * v_trade_size)
      where id = v_user_id;

      perform public.add_position_shares(v_user_id, p_market_id, p_side, -v_trade_size);
      perform public.add_position_shares(v_match.user_id, p_market_id, p_side, v_trade_size);

      insert into public.trades (
        market_id, side, price, size, buyer_id, seller_id, buy_order_id, sell_order_id
      ) values (
        p_market_id, p_side, v_fill_price, v_trade_size,
        v_match.user_id, v_user_id, v_match.id, v_order_id
      );

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

grant execute on function public.place_order(uuid, text, text, numeric, numeric) to authenticated;

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

grant execute on function public.redeem_positions(uuid) to authenticated;

create or replace function public.admin_resolve_market(
  p_market_id uuid,
  p_side text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;
  if p_side not in ('yes', 'no') then
    raise exception 'Invalid side';
  end if;

  update public.markets
  set status = 'resolved', resolved_side = p_side
  where id = p_market_id;

  update public.orders set status = 'cancelled'
  where market_id = p_market_id and status = 'open';
end;
$$;

grant execute on function public.admin_resolve_market(uuid, text) to authenticated;

create or replace function public.admin_set_balance(
  p_user_id uuid,
  p_balance numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;
  update public.profiles set balance = p_balance where id = p_user_id;
end;
$$;

grant execute on function public.admin_set_balance(uuid, numeric) to authenticated;
