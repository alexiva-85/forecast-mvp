-- B3: cancel open orders + B5: Realtime publication for orders/trades

create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.user_id <> v_user_id then
    raise exception 'Not your order';
  end if;

  if v_order.status <> 'open' then
    raise exception 'Order is not open';
  end if;

  update public.orders
  set status = 'cancelled'
  where id = p_order_id;
end;
$$;

grant execute on function public.cancel_order(uuid) to authenticated;

-- Idempotent: safe if migration was applied manually in SQL Editor
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trades'
  ) then
    alter publication supabase_realtime add table public.trades;
  end if;
end;
$$;
