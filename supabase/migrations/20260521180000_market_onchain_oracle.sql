-- E6: привязка рынков к UMA CTF Adapter (testnet condition / question)

alter table public.markets
  add column if not exists onchain_condition_id text,
  add column if not exists onchain_question_id text,
  add column if not exists onchain_adapter_version text not null default 'uma-ctf-adapter-v3.1.0',
  add column if not exists onchain_init_tx_hash text,
  add column if not exists onchain_init_at timestamptz,
  add column if not exists onchain_resolve_status text not null default 'none'
    check (
      onchain_resolve_status in (
        'none',
        'pending_uma',
        'ready_onchain',
        'resolved_onchain',
        'skipped'
      )
    ),
  add column if not exists onchain_resolve_tx_hash text,
  add column if not exists onchain_resolve_at timestamptz,
  add column if not exists onchain_resolve_note text;

create index if not exists markets_onchain_condition_idx
  on public.markets (onchain_condition_id)
  where onchain_condition_id is not null;

comment on column public.markets.onchain_condition_id is
  'CTF conditionId (bytes32 hex). Источник: UmaCtfAdapter.initialize.';
comment on column public.markets.onchain_resolve_status is
  'none | pending_uma | ready_onchain | resolved_onchain | skipped';

create or replace function public.admin_link_market_onchain(
  p_market_id uuid,
  p_condition_id text,
  p_question_id text,
  p_init_tx_hash text default null,
  p_adapter_version text default 'uma-ctf-adapter-v3.1.0'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_title text;
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  p_condition_id := lower(trim(p_condition_id));
  p_question_id := lower(trim(p_question_id));

  if p_condition_id is null or p_condition_id = '' then
    raise exception 'condition_id required';
  end if;
  if p_condition_id !~ '^0x[0-9a-f]{64}$' then
    raise exception 'condition_id must be 0x + 64 hex chars';
  end if;
  if p_question_id is null or p_question_id = '' then
    raise exception 'question_id required';
  end if;
  if p_question_id !~ '^0x[0-9a-f]{64}$' then
    raise exception 'question_id must be 0x + 64 hex chars';
  end if;

  if p_init_tx_hash is not null and trim(p_init_tx_hash) <> '' then
    p_init_tx_hash := lower(trim(p_init_tx_hash));
    if p_init_tx_hash !~ '^0x[0-9a-f]{64}$' then
      raise exception 'init tx hash must be 0x + 64 hex chars';
    end if;
  else
    p_init_tx_hash := null;
  end if;

  select slug, title, status
  into v_slug, v_title, v_status
  from public.markets
  where id = p_market_id;

  if v_slug is null then
    raise exception 'Market not found';
  end if;

  if v_status = 'resolved' then
    raise exception 'Cannot link on-chain after resolve';
  end if;

  update public.markets
  set onchain_condition_id = p_condition_id,
      onchain_question_id = p_question_id,
      onchain_adapter_version = coalesce(nullif(trim(p_adapter_version), ''), 'uma-ctf-adapter-v3.1.0'),
      onchain_init_tx_hash = p_init_tx_hash,
      onchain_init_at = case when p_init_tx_hash is not null then now() else onchain_init_at end,
      onchain_resolve_status = 'none'
  where id = p_market_id;

  perform public.log_admin_action(
    'market.onchain_link',
    'market',
    p_market_id,
    v_slug,
    format('On-chain: condition %s', left(p_condition_id, 10) || '…'),
    jsonb_build_object(
      'condition_id', p_condition_id,
      'question_id', p_question_id,
      'adapter', coalesce(nullif(trim(p_adapter_version), ''), 'uma-ctf-adapter-v3.1.0')
    )
  );
end;
$$;

create or replace function public.admin_skip_market_onchain(p_market_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_title text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select slug, title into v_slug, v_title
  from public.markets where id = p_market_id;

  if v_slug is null then
    raise exception 'Market not found';
  end if;

  update public.markets
  set onchain_resolve_status = 'skipped',
      onchain_resolve_note = coalesce(onchain_resolve_note, 'Skipped by admin (MVP off-chain only)')
  where id = p_market_id;

  perform public.log_admin_action(
    'market.onchain_skip',
    'market',
    p_market_id,
    v_slug,
    format('On-chain пропущен: «%s»', v_title),
    '{}'::jsonb
  );
end;
$$;

create or replace function public.admin_mark_onchain_resolved(
  p_market_id uuid,
  p_resolve_tx_hash text default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_condition text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select slug, onchain_condition_id
  into v_slug, v_condition
  from public.markets where id = p_market_id;

  if v_slug is null then
    raise exception 'Market not found';
  end if;
  if v_condition is null then
    raise exception 'Market has no on-chain condition';
  end if;

  if p_resolve_tx_hash is not null and trim(p_resolve_tx_hash) <> '' then
    p_resolve_tx_hash := lower(trim(p_resolve_tx_hash));
    if p_resolve_tx_hash !~ '^0x[0-9a-f]{64}$' then
      raise exception 'resolve tx hash must be 0x + 64 hex chars';
    end if;
  else
    p_resolve_tx_hash := null;
  end if;

  update public.markets
  set onchain_resolve_status = 'resolved_onchain',
      onchain_resolve_tx_hash = p_resolve_tx_hash,
      onchain_resolve_at = now(),
      onchain_resolve_note = nullif(trim(p_note), '')
  where id = p_market_id;

  perform public.log_admin_action(
    'market.onchain_resolved',
    'market',
    p_market_id,
    v_slug,
    'On-chain resolve отмечен оператором',
    jsonb_build_object('has_tx', p_resolve_tx_hash is not null)
  );
end;
$$;

-- После off-chain резолва: pending_uma если есть condition
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
  v_condition text;
  v_onchain_status text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  perform public.validate_market_outcome(p_market_id, p_side);

  select status, slug, title, onchain_condition_id, onchain_resolve_status
  into v_status, v_slug, v_title, v_condition, v_onchain_status
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
      resolved_by = auth.uid(),
      onchain_resolve_status = case
        when v_onchain_status = 'skipped' then 'skipped'
        when v_onchain_status = 'resolved_onchain' then 'resolved_onchain'
        when v_condition is not null then 'pending_uma'
        else onchain_resolve_status
      end
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
      'has_proof', v_proof is not null,
      'onchain_pending', v_condition is not null and v_onchain_status not in ('skipped', 'resolved_onchain')
    )
  );
end;
$$;

grant execute on function public.admin_link_market_onchain(uuid, text, text, text, text) to authenticated;
grant execute on function public.admin_skip_market_onchain(uuid) to authenticated;
grant execute on function public.admin_mark_onchain_resolved(uuid, text, text) to authenticated;
