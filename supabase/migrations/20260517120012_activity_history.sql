-- D5: история операций (сделки, отмены, выплаты)

create table public.account_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('redeem')),
  market_id uuid references public.markets (id) on delete set null,
  amount numeric(18, 4) not null,
  created_at timestamptz not null default now()
);

create index account_events_user_created_idx
  on public.account_events (user_id, created_at desc);

alter table public.account_events enable row level security;

create policy "account_events read own" on public.account_events
  for select using (auth.uid() = user_id);

revoke insert, update, delete on public.account_events from anon, authenticated;

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

    insert into public.account_events (user_id, kind, market_id, amount)
    values (v_user_id, 'redeem', p_market_id, v_payout);
  end if;

  update public.positions set shares = 0
  where user_id = v_user_id and market_id = p_market_id and side <> v_market.resolved_side;

  return v_payout;
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
  ) u
  order by event_at desc
  limit v_limit;
end;
$$;

grant execute on function public.list_my_activity(integer) to authenticated;
