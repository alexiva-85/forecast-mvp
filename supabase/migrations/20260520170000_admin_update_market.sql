-- A2: редактирование рынка после публикации (с аудитом)

create or replace function public.admin_update_market(
  p_market_slug text,
  p_title text,
  p_description text,
  p_category text,
  p_closes_at timestamptz,
  p_resolution_rules text,
  p_resolution_checklist jsonb,
  p_tags text[] default '{}'::text[],
  p_new_slug text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market_id uuid;
  v_status text;
  v_slug text;
  v_new_slug text;
  v_title text;
  v_old record;
  v_tags text[];
  v_changes jsonb := '{}'::jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  v_slug := trim(p_market_slug);

  select * into v_old
  from public.markets
  where slug = v_slug;

  if v_old.id is null then
    raise exception 'Market not found';
  end if;

  if v_old.status = 'resolved' then
    raise exception 'Cannot edit resolved market';
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

  v_new_slug := v_slug;
  if p_new_slug is not null and trim(p_new_slug) <> '' and trim(p_new_slug) <> v_slug then
    if v_old.status <> 'draft' then
      raise exception 'Slug cannot be changed after publish';
    end if;
    if trim(p_new_slug) !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
      raise exception 'Invalid slug';
    end if;
    v_new_slug := trim(p_new_slug);
  end if;

  if trim(p_title) is distinct from v_old.title then
    v_changes := v_changes || jsonb_build_object(
      'title', jsonb_build_object('from', v_old.title, 'to', trim(p_title))
    );
  end if;

  if nullif(trim(p_description), '') is distinct from v_old.description then
    v_changes := v_changes || jsonb_build_object(
      'description',
      jsonb_build_object('from', v_old.description, 'to', nullif(trim(p_description), ''))
    );
  end if;

  if p_category is distinct from v_old.category then
    v_changes := v_changes || jsonb_build_object(
      'category', jsonb_build_object('from', v_old.category, 'to', p_category)
    );
  end if;

  if p_closes_at is distinct from v_old.closes_at then
    v_changes := v_changes || jsonb_build_object(
      'closes_at',
      jsonb_build_object('from', v_old.closes_at, 'to', p_closes_at)
    );
  end if;

  if trim(p_resolution_rules) is distinct from v_old.resolution_rules then
    v_changes := v_changes || jsonb_build_object(
      'resolution_rules',
      jsonb_build_object('from', v_old.resolution_rules, 'to', trim(p_resolution_rules))
    );
  end if;

  if p_resolution_checklist is distinct from v_old.resolution_checklist then
    v_changes := v_changes || jsonb_build_object(
      'resolution_checklist',
      jsonb_build_object('from', v_old.resolution_checklist, 'to', p_resolution_checklist)
    );
  end if;

  if v_tags is distinct from coalesce(v_old.tags, '{}'::text[]) then
    v_changes := v_changes || jsonb_build_object(
      'tags', jsonb_build_object('from', coalesce(v_old.tags, '{}'::text[]), 'to', v_tags)
    );
  end if;

  if v_new_slug is distinct from v_slug then
    v_changes := v_changes || jsonb_build_object(
      'slug', jsonb_build_object('from', v_slug, 'to', v_new_slug)
    );
  end if;

  if v_changes = '{}'::jsonb then
    return v_slug;
  end if;

  update public.markets
  set
    slug = v_new_slug,
    title = trim(p_title),
    description = nullif(trim(p_description), ''),
    category = p_category,
    closes_at = p_closes_at,
    resolution_rules = trim(p_resolution_rules),
    resolution_checklist = p_resolution_checklist,
    tags = v_tags
  where id = v_old.id
  returning id, title into v_market_id, v_title;

  perform public.log_admin_action(
    'market.update',
    'market',
    v_market_id,
    v_new_slug,
    format('Изменён рынок «%s»', v_title),
    jsonb_build_object('changes', v_changes, 'status', v_old.status)
  );

  return v_new_slug;
end;
$$;

grant execute on function public.admin_update_market(
  text, text, text, text, timestamptz, text, jsonb, text[], text
) to authenticated;
