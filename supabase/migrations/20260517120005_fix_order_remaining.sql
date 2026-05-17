-- Filled/cancelled orders may have remaining = 0 (found by G1 tests)

alter table public.orders drop constraint if exists orders_remaining_check;

alter table public.orders add constraint orders_remaining_check
  check (remaining >= 0);

alter table public.orders add constraint orders_open_has_remaining_check
  check (status <> 'open' or remaining > 0);
