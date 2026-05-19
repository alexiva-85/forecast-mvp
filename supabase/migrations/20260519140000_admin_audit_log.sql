-- A4: лог действий админа (кто, когда, что)

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id),
  action text not null,
  entity_type text not null check (entity_type in ('market', 'platform', 'user')),
  entity_id uuid,
  entity_slug text,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

create or replace function public.log_admin_action(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_entity_slug text default null,
  p_summary text default '',
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.admin_audit_log (
    admin_id,
    action,
    entity_type,
    entity_id,
    entity_slug,
    summary,
    metadata
  ) values (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    nullif(trim(p_entity_slug), ''),
    coalesce(nullif(trim(p_summary), ''), p_action),
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.admin_audit_log_list(
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  created_at timestamptz,
  admin_id uuid,
  admin_display_name text,
  action text,
  entity_type text,
  entity_id uuid,
  entity_slug text,
  summary text,
  metadata jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select
    l.id,
    l.created_at,
    l.admin_id,
    p.display_name as admin_display_name,
    l.action,
    l.entity_type,
    l.entity_id,
    l.entity_slug,
    l.summary,
    l.metadata
  from public.admin_audit_log l
  join public.profiles p on p.id = l.admin_id
  order by l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

grant execute on function public.admin_audit_log_list(int, int) to authenticated;

-- Обновление admin RPC с записью в лог

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

  perform public.log_admin_action(
    'market.create',
    'market',
    v_market_id,
    p_slug,
    format('Создан рынок «%s»', trim(p_title)),
    jsonb_build_object(
      'category', p_category,
      'is_sandbox', coalesce(p_is_sandbox, false),
      'outcome_mode', case when v_use_multi then 'multi' else 'binary' end
    )
  );

  return v_market_id;
end;
$$;

create or replace function public.admin_resolve_market(
  p_market_id uuid,
  p_side text,
  p_comment text default null,
  p_proof_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_slug text;
  v_title text;
  v_comment text;
  v_proof text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  perform public.validate_market_outcome(p_market_id, p_side);

  select status, slug, title
  into v_status, v_slug, v_title
  from public.markets
  where id = p_market_id;

  if v_status is null then
    raise exception 'Market not found';
  end if;
  if v_status <> 'closed' then
    raise exception 'Market must be closed before resolve';
  end if;

  v_comment := nullif(trim(p_comment), '');
  v_proof := nullif(trim(p_proof_url), '');

  if v_comment is not null and char_length(v_comment) > 2000 then
    raise exception 'Resolve comment too long';
  end if;

  if v_proof is not null then
    if char_length(v_proof) > 2048 then
      raise exception 'Proof URL too long';
    end if;
    if v_proof !~* '^https?://' then
      raise exception 'Proof URL must start with http:// or https://';
    end if;
  end if;

  update public.markets
  set status = 'resolved',
      resolved_side = p_side,
      resolved_outcome_key = p_side,
      resolve_comment = v_comment,
      resolve_proof_url = v_proof,
      resolved_at = now(),
      resolved_by = auth.uid()
  where id = p_market_id;

  update public.orders set status = 'cancelled'
  where market_id = p_market_id and status = 'open';

  perform public.log_admin_action(
    'market.resolve',
    'market',
    p_market_id,
    v_slug,
    format('Резолв «%s» → %s', v_title, p_side),
    jsonb_build_object(
      'outcome', p_side,
      'has_comment', v_comment is not null,
      'has_proof', v_proof is not null
    )
  );
end;
$$;

create or replace function public.admin_close_market(p_market_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market_id uuid;
  v_status text;
  v_title text;
  v_slug text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  v_slug := trim(p_market_slug);

  select id, status, title into v_market_id, v_status, v_title
  from public.markets
  where slug = v_slug;

  if v_market_id is null then
    raise exception 'Market not found';
  end if;

  if v_status <> 'open' then
    raise exception 'Market is not open';
  end if;

  update public.markets
  set status = 'closed'
  where id = v_market_id;

  update public.orders
  set status = 'cancelled'
  where market_id = v_market_id and status = 'open';

  perform public.log_admin_action(
    'market.close',
    'market',
    v_market_id,
    v_slug,
    format('Закрыты торги: «%s»', v_title),
    '{}'::jsonb
  );
end;
$$;

create or replace function public.admin_publish_market(p_market_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market_id uuid;
  v_title text;
  v_slug text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  v_slug := trim(p_market_slug);

  select id, title into v_market_id, v_title
  from public.markets
  where slug = v_slug;

  if v_market_id is null then
    raise exception 'Market not found';
  end if;

  update public.markets
  set is_sandbox = false
  where id = v_market_id;

  perform public.log_admin_action(
    'market.publish',
    'market',
    v_market_id,
    v_slug,
    format('В каталог: «%s»', v_title),
    '{}'::jsonb
  );
end;
$$;

create or replace function public.admin_grant_test_shares(
  p_user_email text,
  p_market_slug text,
  p_outcome_key text,
  p_shares numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_market_id uuid;
  v_slug text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_shares is null or p_shares <= 0 or p_shares > 100000 then
    raise exception 'Invalid share amount';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(trim(p_user_email));

  if v_user_id is null then
    raise exception 'User not found';
  end if;

  v_slug := trim(p_market_slug);

  select id into v_market_id
  from public.markets
  where slug = v_slug;

  if v_market_id is null then
    raise exception 'Market not found';
  end if;

  update public.markets
  set is_sandbox = true
  where id = v_market_id and not is_sandbox;

  perform public.validate_market_outcome(v_market_id, trim(p_outcome_key));

  insert into public.positions (user_id, market_id, side, shares)
  values (v_user_id, v_market_id, trim(p_outcome_key), p_shares)
  on conflict (user_id, market_id, side)
  do update set shares = excluded.shares;

  perform public.log_admin_action(
    'user.grant_test_shares',
    'user',
    v_user_id,
    v_slug,
    format('Тестовые доли %s × %s на %s', p_shares, trim(p_outcome_key), v_slug),
    jsonb_build_object(
      'user_email', lower(trim(p_user_email)),
      'outcome_key', trim(p_outcome_key),
      'shares', p_shares
    )
  );
end;
$$;

create or replace function public.admin_set_trade_fee_rate(p_rate numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old numeric;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;
  if p_rate < 0 or p_rate > 0.05 then
    raise exception 'Fee rate must be between 0 and 0.05';
  end if;

  select trade_fee_rate into v_old from public.platform_settings where id = 1;

  update public.platform_settings
  set trade_fee_rate = p_rate, updated_at = now()
  where id = 1;

  perform public.log_admin_action(
    'platform.set_fee_rate',
    'platform',
    null,
    null,
    format('Комиссия: %s%% → %s%%', round(v_old * 100, 2), round(p_rate * 100, 2)),
    jsonb_build_object('old_rate', v_old, 'new_rate', p_rate)
  );
end;
$$;
