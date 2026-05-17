-- Admin panel v1: sandbox markets, safe resolve, stats helper

alter table public.markets
  add column if not exists is_sandbox boolean not null default false;

create index if not exists markets_list_idx
  on public.markets (is_sandbox, status, created_at desc);

-- Backfill test markets from integration tests
update public.markets
set is_sandbox = true
where slug like 'test-market-%'
   or slug like 'expired-market%'
   or title ilike 'test market%'
   or title ilike 'expired market%';

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
  if p_side not in ('yes', 'no') then
    raise exception 'Invalid side';
  end if;

  select status into v_status from public.markets where id = p_market_id;
  if v_status is null then
    raise exception 'Market not found';
  end if;
  if v_status <> 'closed' then
    raise exception 'Market must be closed before resolve';
  end if;

  update public.markets
  set status = 'resolved', resolved_side = p_side
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
  p_is_sandbox boolean default false
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

  return v_market_id;
end;
$$;

drop function if exists public.admin_create_market(
  text, text, text, text, timestamptz, text, jsonb, text[]
);

grant execute on function public.admin_create_market(
  text, text, text, text, timestamptz, text, jsonb, text[], boolean
) to authenticated;

create or replace function public.admin_market_stats(p_market_ids uuid[] default null)
returns table (
  market_id uuid,
  trade_count bigint,
  volume_usd numeric,
  open_orders bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id as market_id,
    count(t.id)::bigint as trade_count,
    coalesce(sum(t.price * t.size), 0)::numeric as volume_usd,
    count(o.id) filter (where o.status = 'open')::bigint as open_orders
  from public.markets m
  left join public.trades t on t.market_id = m.id
  left join public.orders o on o.market_id = m.id
  where public.is_admin()
    and (p_market_ids is null or m.id = any(p_market_ids))
  group by m.id;
$$;

grant execute on function public.admin_market_stats(uuid[]) to authenticated;
