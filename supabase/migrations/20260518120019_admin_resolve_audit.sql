-- A3: комментарий и URL доказательства при резолве

alter table public.markets
  add column if not exists resolve_comment text,
  add column if not exists resolve_proof_url text,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references public.profiles (id);

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
  v_comment text;
  v_proof text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  perform public.validate_market_outcome(p_market_id, p_side);

  select status into v_status from public.markets where id = p_market_id;
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
end;
$$;

grant execute on function public.admin_resolve_market(uuid, text, text, text) to authenticated;
