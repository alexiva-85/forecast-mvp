-- G3: tighten RLS — no direct writes to ledger tables; safe profile updates

drop policy if exists "profiles update own name" on public.profiles;

create or replace function public.update_display_name(p_display_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set display_name = nullif(trim(p_display_name), '')
  where id = auth.uid();
end;
$$;

grant execute on function public.update_display_name(text) to authenticated;

-- Direct API must not mutate balances, orders, trades, positions, markets, fees
revoke insert, update, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.trades from anon, authenticated;
revoke insert, update, delete on public.positions from anon, authenticated;
revoke insert, update, delete on public.markets from anon, authenticated;
revoke insert, update, delete on public.platform_settings from anon, authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;

grant select on public.orders to anon, authenticated;
grant select on public.trades to anon, authenticated;
grant select on public.positions to anon, authenticated;
grant select on public.markets to anon, authenticated;
grant select on public.platform_settings to anon, authenticated;
grant select on public.profiles to authenticated;

-- Users may read only their own profile (existing policy); anon cannot read profiles
revoke select on public.profiles from anon;
