-- Снять флаг sandbox: рынок снова в публичном каталоге

create or replace function public.admin_publish_market(p_market_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select id into v_market_id
  from public.markets
  where slug = trim(p_market_slug);

  if v_market_id is null then
    raise exception 'Market not found';
  end if;

  update public.markets
  set is_sandbox = false
  where id = v_market_id;
end;
$$;
