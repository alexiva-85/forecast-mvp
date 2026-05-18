-- A18: ручное закрытие торгов оператором

create or replace function public.admin_close_market(p_market_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market_id uuid;
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select id, status into v_market_id, v_status
  from public.markets
  where slug = trim(p_market_slug);

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
end;
$$;

grant execute on function public.admin_close_market(text) to authenticated;
