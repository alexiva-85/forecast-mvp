-- F1: раздельная сверка ledger и fee_balance

drop function if exists public.admin_platform_fee_summary();

create or replace function public.admin_platform_fee_summary()
returns table (
  trade_fee_rate numeric,
  fee_balance numeric,
  trades_fee_total numeric,
  ledger_fee_total numeric,
  ledger_reconcile_ok boolean,
  balance_reconcile_ok boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rate numeric;
  v_balance numeric;
  v_trades_total numeric;
  v_ledger_total numeric;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select ps.trade_fee_rate, ps.fee_balance
  into v_rate, v_balance
  from public.platform_settings ps
  where ps.id = 1;

  select coalesce(sum(t.fee_amount), 0) into v_trades_total
  from public.trades t;

  select coalesce(-sum(l.amount), 0) into v_ledger_total
  from public.balance_ledger l
  where l.kind = 'trade_fee';

  return query
  select
    v_rate,
    v_balance,
    v_trades_total,
    v_ledger_total,
    abs(v_trades_total - v_ledger_total) < 0.0001 as ledger_reconcile_ok,
    abs(v_balance - v_trades_total) < 0.0001 as balance_reconcile_ok;
end;
$$;
