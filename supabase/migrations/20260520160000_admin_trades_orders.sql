-- A12: раздел «Сделки / ордера» — списки для поддержки и расследований

create or replace function public.admin_orders_list(
  p_search text default null,
  p_status text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  user_id uuid,
  user_email text,
  user_display_name text,
  market_id uuid,
  market_slug text,
  market_title text,
  side text,
  outcome_label text,
  direction text,
  price numeric,
  size numeric,
  remaining numeric,
  status text,
  order_kind text,
  time_in_force text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_search text := nullif(trim(p_search), '');
  v_status text := nullif(trim(lower(p_status)), '');
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if v_status is not null and v_status not in ('open', 'filled', 'cancelled') then
    raise exception 'Invalid order status filter';
  end if;

  return query
  select
    o.id,
    o.user_id,
    u.email::text,
    p.display_name,
    m.id,
    m.slug,
    m.title,
    o.side,
    mo.label,
    o.direction,
    o.price,
    o.size,
    o.remaining,
    o.status,
    o.order_kind,
    o.time_in_force,
    o.created_at
  from public.orders o
  join public.profiles p on p.id = o.user_id
  join auth.users u on u.id = o.user_id
  join public.markets m on m.id = o.market_id
  left join public.market_outcomes mo
    on mo.market_id = o.market_id and mo.outcome_key = o.side
  where
    (v_status is null or o.status = v_status)
    and (
      v_search is null
      or lower(u.email) like '%' || lower(v_search) || '%'
      or lower(coalesce(p.display_name, '')) like '%' || lower(v_search) || '%'
      or lower(m.slug) like '%' || lower(v_search) || '%'
      or lower(m.title) like '%' || lower(v_search) || '%'
      or o.id::text like v_search || '%'
      or o.user_id::text = v_search
    )
  order by o.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_trades_list(
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  market_id uuid,
  market_slug text,
  market_title text,
  side text,
  outcome_label text,
  price numeric,
  size numeric,
  fee_amount numeric,
  buyer_id uuid,
  buyer_email text,
  seller_id uuid,
  seller_email text,
  buy_order_id uuid,
  sell_order_id uuid,
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
    t.id,
    m.id,
    m.slug,
    m.title,
    t.side,
    mo.label,
    t.price,
    t.size,
    t.fee_amount,
    t.buyer_id,
    bu.email::text,
    t.seller_id,
    su.email::text,
    t.buy_order_id,
    t.sell_order_id,
    t.created_at
  from public.trades t
  join public.markets m on m.id = t.market_id
  left join public.market_outcomes mo
    on mo.market_id = t.market_id and mo.outcome_key = t.side
  join auth.users bu on bu.id = t.buyer_id
  join auth.users su on su.id = t.seller_id
  where
    v_search is null
    or lower(bu.email) like '%' || lower(v_search) || '%'
    or lower(su.email) like '%' || lower(v_search) || '%'
    or lower(m.slug) like '%' || lower(v_search) || '%'
    or lower(m.title) like '%' || lower(v_search) || '%'
    or t.id::text like v_search || '%'
    or t.buyer_id::text = v_search
    or t.seller_id::text = v_search
  order by t.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

grant execute on function public.admin_orders_list(text, text, int, int) to authenticated;
grant execute on function public.admin_trades_list(text, int, int) to authenticated;
