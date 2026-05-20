-- F3: public leaderboards (traders + markets by volume, excluding sandbox)

create or replace function public.leaderboard_summary(p_days int default 7)
returns table (
  volume_usd numeric,
  trade_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(t.price * t.size), 0)::numeric as volume_usd,
    count(t.id)::bigint as trade_count
  from public.trades t
  inner join public.markets m on m.id = t.market_id
  where coalesce(m.is_sandbox, false) = false
    and (
      p_days is null
      or t.created_at >= now() - make_interval(days => greatest(p_days, 1))
    );
$$;

create or replace function public.leaderboard_traders(
  p_days int default 7,
  p_limit int default 20
)
returns table (
  rank bigint,
  user_id uuid,
  display_label text,
  volume_usd numeric,
  trade_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with participants as (
    select
      t.id as trade_id,
      t.buyer_id as user_id,
      t.price * t.size as notional,
      t.created_at
    from public.trades t
    inner join public.markets m on m.id = t.market_id
    where coalesce(m.is_sandbox, false) = false
      and (
        p_days is null
        or t.created_at >= now() - make_interval(days => greatest(p_days, 1))
      )
    union all
    select
      t.id,
      t.seller_id,
      t.price * t.size,
      t.created_at
    from public.trades t
    inner join public.markets m on m.id = t.market_id
    where coalesce(m.is_sandbox, false) = false
      and (
        p_days is null
        or t.created_at >= now() - make_interval(days => greatest(p_days, 1))
      )
  ),
  aggregated as (
    select
      p.user_id,
      sum(p.notional)::numeric as volume_usd,
      count(distinct p.trade_id)::bigint as trade_count
    from participants p
    group by p.user_id
    having sum(p.notional) > 0
  )
  select
    row_number() over (order by a.volume_usd desc, a.trade_count desc, a.user_id)::bigint
      as rank,
    a.user_id,
    coalesce(
      nullif(trim(pr.display_name), ''),
      'Участник ' || upper(left(replace(a.user_id::text, '-', ''), 6))
    ) as display_label,
    a.volume_usd,
    a.trade_count
  from aggregated a
  inner join public.profiles pr on pr.id = a.user_id
  order by rank
  limit greatest(least(coalesce(p_limit, 20), 50), 1);
$$;

create or replace function public.leaderboard_top_markets(
  p_days int default 7,
  p_limit int default 10
)
returns table (
  rank bigint,
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
    row_number() over (
      order by coalesce(sum(t.price * t.size), 0) desc, count(t.id) desc, m.title
    )::bigint as rank,
    m.id as market_id,
    m.slug,
    m.title,
    m.category,
    coalesce(sum(t.price * t.size), 0)::numeric as volume_usd,
    count(t.id)::bigint as trade_count
  from public.markets m
  inner join public.trades t
    on t.market_id = m.id
    and (
      p_days is null
      or t.created_at >= now() - make_interval(days => greatest(p_days, 1))
    )
  where coalesce(m.is_sandbox, false) = false
    and m.status <> 'draft'
  group by m.id, m.slug, m.title, m.category
  having count(t.id) > 0
  order by rank
  limit greatest(least(coalesce(p_limit, 10), 50), 1);
$$;

create or replace function public.leaderboard_my_rank(p_days int default 7)
returns table (
  rank bigint,
  volume_usd numeric,
  trade_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with participants as (
    select
      t.id as trade_id,
      t.buyer_id as user_id,
      t.price * t.size as notional
    from public.trades t
    inner join public.markets m on m.id = t.market_id
    where coalesce(m.is_sandbox, false) = false
      and (
        p_days is null
        or t.created_at >= now() - make_interval(days => greatest(p_days, 1))
      )
    union all
    select t.id, t.seller_id, t.price * t.size
    from public.trades t
    inner join public.markets m on m.id = t.market_id
    where coalesce(m.is_sandbox, false) = false
      and (
        p_days is null
        or t.created_at >= now() - make_interval(days => greatest(p_days, 1))
      )
  ),
  aggregated as (
    select
      p.user_id,
      sum(p.notional)::numeric as volume_usd,
      count(distinct p.trade_id)::bigint as trade_count
    from participants p
    group by p.user_id
    having sum(p.notional) > 0
  ),
  ranked as (
    select
      a.user_id,
      row_number() over (order by a.volume_usd desc, a.trade_count desc, a.user_id)::bigint
        as rank,
      a.volume_usd,
      a.trade_count
    from aggregated a
  )
  select r.rank, r.volume_usd, r.trade_count
  from ranked r
  where auth.uid() is not null
    and r.user_id = auth.uid();
$$;

grant execute on function public.leaderboard_summary(int) to anon, authenticated;
grant execute on function public.leaderboard_traders(int, int) to anon, authenticated;
grant execute on function public.leaderboard_top_markets(int, int) to anon, authenticated;
grant execute on function public.leaderboard_my_rank(int) to authenticated;
