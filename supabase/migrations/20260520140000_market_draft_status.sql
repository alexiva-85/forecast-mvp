-- A1: черновики рынков (status = draft), отдельно от sandbox (is_sandbox)

alter table public.markets drop constraint if exists markets_status_check;

alter table public.markets
  add constraint markets_status_check
  check (status in ('draft', 'open', 'closed', 'resolved'));

create index if not exists markets_draft_idx
  on public.markets (created_at desc)
  where status = 'draft';

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
  v_use_multi boolean;
  v_is_sandbox boolean;
  v_status text;
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

  v_use_multi := p_outcomes is not null
    and jsonb_typeof(p_outcomes) = 'array'
    and jsonb_array_length(p_outcomes) >= 3;

  v_is_sandbox := coalesce(p_is_sandbox, false);
  v_status := case when v_is_sandbox then 'open' else 'draft' end;

  insert into public.markets (
    slug,
    title,
    description,
    category,
    status,
    closes_at,
    resolution_rules,
    resolution_checklist,
    tags,
    is_sandbox,
    outcome_mode
  ) values (
    p_slug,
    trim(p_title),
    nullif(trim(p_description), ''),
    p_category,
    v_status,
    p_closes_at,
    trim(p_resolution_rules),
    p_resolution_checklist,
    v_tags,
    v_is_sandbox,
    case when v_use_multi then 'multi' else 'binary' end
  )
  returning id into v_market_id;

  delete from public.market_outcomes where market_id = v_market_id;

  if v_use_multi then
    perform public.seed_market_outcomes_from_json(v_market_id, p_outcomes);
  else
    perform public.seed_binary_market_outcomes(v_market_id);
  end if;

  perform public.log_admin_action(
    'market.create',
    'market',
    v_market_id,
    p_slug,
    format('Создан рынок «%s»', trim(p_title)),
    jsonb_build_object(
      'category', p_category,
      'is_sandbox', v_is_sandbox,
      'status', v_status,
      'outcome_mode', case when v_use_multi then 'multi' else 'binary' end
    )
  );

  return v_market_id;
end;
$$;

create or replace function public.admin_publish_draft_market(p_market_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market_id uuid;
  v_title text;
  v_slug text;
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  v_slug := trim(p_market_slug);

  select id, title, status into v_market_id, v_title, v_status
  from public.markets
  where slug = v_slug;

  if v_market_id is null then
    raise exception 'Market not found';
  end if;

  if v_status <> 'draft' then
    raise exception 'Market is not draft';
  end if;

  update public.markets
  set status = 'open'
  where id = v_market_id;

  perform public.log_admin_action(
    'market.publish_draft',
    'market',
    v_market_id,
    v_slug,
    format('Опубликован: «%s»', v_title),
    '{}'::jsonb
  );
end;
$$;

grant execute on function public.admin_publish_draft_market(text) to authenticated;

-- Метрики дашборда: только опубликованные production-рынки
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
    coalesce(sum(case when t.created_at >= now() - interval '1 day' then t.price * t.size end), 0),
    coalesce(sum(case when t.created_at >= now() - interval '7 days' then t.price * t.size end), 0),
    coalesce(sum(case when t.created_at >= now() - interval '30 days' then t.price * t.size end), 0),
    count(*) filter (where t.created_at >= now() - interval '1 day'),
    count(*) filter (where t.created_at >= now() - interval '7 days'),
    count(*) filter (where t.created_at >= now() - interval '30 days')
  from public.trades t
  join public.markets m on m.id = t.market_id
  where coalesce(m.is_sandbox, false) = false
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
    m.id,
    m.slug,
    m.title,
    m.category,
    coalesce(sum(t.price * t.size), 0),
    count(t.id)
  from public.markets m
  left join public.trades t
    on t.market_id = m.id
    and t.created_at >= now() - make_interval(days => greatest(p_days, 1))
  where coalesce(m.is_sandbox, false) = false
    and m.status <> 'draft'
  group by m.id, m.slug, m.title, m.category
  having count(t.id) > 0
  order by 5 desc
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;
