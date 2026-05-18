-- PostgREST: single admin_create_market overload (8-arg vs 9-arg broke multi-outcome)

drop function if exists public.admin_create_market(text, text, text, text, timestamptz, text, jsonb);
drop function if exists public.admin_create_market(text, text, text, text, timestamptz, text, jsonb, text[]);
drop function if exists public.admin_create_market(text, text, text, text, timestamptz, text, jsonb, text[], boolean);
drop function if exists public.admin_create_market(
  text, text, text, text, timestamptz, text, jsonb, text[], boolean, jsonb
);

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

  insert into public.markets (
    slug,
    title,
    description,
    category,
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
    p_closes_at,
    trim(p_resolution_rules),
    p_resolution_checklist,
    v_tags,
    coalesce(p_is_sandbox, false),
    case when v_use_multi then 'multi' else 'binary' end
  )
  returning id into v_market_id;

  delete from public.market_outcomes where market_id = v_market_id;

  if v_use_multi then
    perform public.seed_market_outcomes_from_json(v_market_id, p_outcomes);
  else
    perform public.seed_binary_market_outcomes(v_market_id);
  end if;

  return v_market_id;
end;
$$;

grant execute on function public.admin_create_market(
  text, text, text, text, timestamptz, text, jsonb, text[], boolean, jsonb
) to authenticated;
