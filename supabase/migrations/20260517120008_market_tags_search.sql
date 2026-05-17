-- C5: tags on markets + search support

alter table public.markets
  add column if not exists tags text[] not null default '{}';

create index if not exists markets_tags_gin_idx on public.markets using gin (tags);

create or replace function public.normalize_market_tags(p_tags text[])
returns text[]
language sql
immutable
as $$
  select coalesce(
    array_agg(distinct tag order by tag),
    '{}'::text[]
  )
  from (
    select lower(trim(t)) as tag
    from unnest(coalesce(p_tags, '{}'::text[])) as t
    where length(trim(t)) between 2 and 32
      and trim(t) !~ '[,]'
  ) s;
$$;

create or replace function public.admin_create_market(
  p_slug text,
  p_title text,
  p_description text,
  p_category text,
  p_closes_at timestamptz,
  p_resolution_rules text,
  p_resolution_checklist jsonb,
  p_tags text[] default '{}'::text[]
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
    tags
  ) values (
    p_slug,
    trim(p_title),
    nullif(trim(p_description), ''),
    p_category,
    p_closes_at,
    trim(p_resolution_rules),
    p_resolution_checklist,
    v_tags
  )
  returning id into v_market_id;

  return v_market_id;
end;
$$;

drop function if exists public.admin_create_market(
  text, text, text, text, timestamptz, text, jsonb
);

grant execute on function public.admin_create_market(
  text, text, text, text, timestamptz, text, jsonb, text[]
) to authenticated;

update public.markets set tags = public.normalize_market_tags(array['футбол', 'лч', 'реал'])
where slug = 'real-madrid-ucl-2026' and tags = '{}';

update public.markets set tags = public.normalize_market_tags(array['bitcoin', 'btc', 'крипто'])
where slug = 'btc-150k-2026' and tags = '{}';

update public.markets set tags = public.normalize_market_tags(array['футбол', 'чм', 'россия'])
where slug = 'russia-world-cup-2026' and tags = '{}';
