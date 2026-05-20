-- Восстановить is_admin() в метриках + исключить draft

create or replace function public.admin_platform_volume()
returns table (
  volume_24h numeric,
  volume_7d numeric,
  volume_30d numeric,
  trades_24h bigint,
  trades_7d bigint,
  trades_30d bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(
      sum(t.price * t.size) filter (
        where t.created_at >= now() - interval '24 hours'
      ),
      0
    )::numeric as volume_24h,
    coalesce(
      sum(t.price * t.size) filter (
        where t.created_at >= now() - interval '7 days'
      ),
      0
    )::numeric as volume_7d,
    coalesce(
      sum(t.price * t.size) filter (
        where t.created_at >= now() - interval '30 days'
      ),
      0
    )::numeric as volume_30d,
    count(t.id) filter (
      where t.created_at >= now() - interval '24 hours'
    )::bigint as trades_24h,
    count(t.id) filter (
      where t.created_at >= now() - interval '7 days'
    )::bigint as trades_7d,
    count(t.id) filter (
      where t.created_at >= now() - interval '30 days'
    )::bigint as trades_30d
  from public.trades t
  inner join public.markets m on m.id = t.market_id
  where public.is_admin()
    and coalesce(m.is_sandbox, false) = false
    and m.status <> 'draft';
$$;

create or replace function public.admin_top_markets_by_volume(
  p_days int default 7,
  p_limit int default 10
)
returns table (
  market_id uuid,
  slug text,
  title text,
  category text,
  volume_usd numeric,
  trade_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id as market_id,
    m.slug,
    m.title,
    m.category,
    coalesce(sum(t.price * t.size), 0)::numeric as volume_usd,
    count(t.id)::bigint as trade_count
  from public.markets m
  inner join public.trades t
    on t.market_id = m.id
    and t.created_at >= now() - make_interval(days => greatest(p_days, 1))
  where public.is_admin()
    and coalesce(m.is_sandbox, false) = false
    and m.status <> 'draft'
  group by m.id, m.slug, m.title, m.category
  having count(t.id) > 0
  order by volume_usd desc, trade_count desc, m.title
  limit greatest(least(coalesce(p_limit, 10), 50), 1);
$$;
