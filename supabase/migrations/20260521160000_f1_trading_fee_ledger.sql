-- F1: аудит торговой комиссии в balance_ledger (off-chain).
-- Удержание fee при матче — B6; on-chain fee layer — блок E5.

alter table public.balance_ledger
  add column if not exists trade_id uuid references public.trades (id) on delete set null;

create index if not exists balance_ledger_trade_idx
  on public.balance_ledger (trade_id)
  where trade_id is not null;

alter table public.balance_ledger
  drop constraint if exists balance_ledger_kind_check;

alter table public.balance_ledger
  add constraint balance_ledger_kind_check
  check (
    kind in (
      'opening_snapshot',
      'signup_grant',
      'withdrawal_hold',
      'withdrawal_release',
      'withdrawal_complete',
      'deposit',
      'admin_adjust',
      'referral_bonus',
      'trade_fee'
    )
  );

-- Запись комиссии в ledger без повторного изменения balance (уже списано в place_order).
create or replace function public.record_trade_fee_ledger(
  p_user_id uuid,
  p_amount numeric,
  p_trade_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
  v_entry_id uuid;
begin
  if p_amount >= 0 then
    raise exception 'Trade fee ledger amount must be negative';
  end if;

  select balance into v_balance
  from public.profiles
  where id = p_user_id;

  if v_balance is null then
    raise exception 'Profile not found';
  end if;

  insert into public.balance_ledger (
    user_id,
    amount,
    balance_after,
    kind,
    trade_id,
    note
  ) values (
    p_user_id,
    p_amount,
    v_balance,
    'trade_fee',
    p_trade_id,
    'Trading fee (50% share)'
  )
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

revoke all on function public.record_trade_fee_ledger(uuid, numeric, uuid) from public;
revoke all on function public.record_trade_fee_ledger(uuid, numeric, uuid) from anon, authenticated;

create or replace function public.trades_record_fee_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_fee numeric;
  v_seller_fee numeric;
begin
  if coalesce(NEW.fee_amount, 0) <= 0 then
    return NEW;
  end if;

  v_buyer_fee := round(NEW.fee_amount / 2, 4);
  v_seller_fee := NEW.fee_amount - v_buyer_fee;

  perform public.record_trade_fee_ledger(NEW.buyer_id, -v_buyer_fee, NEW.id);
  perform public.record_trade_fee_ledger(NEW.seller_id, -v_seller_fee, NEW.id);

  return NEW;
end;
$$;

drop trigger if exists trades_fee_ledger on public.trades;

create trigger trades_fee_ledger
  after insert on public.trades
  for each row
  execute function public.trades_record_fee_ledger();

-- Исторические сделки до триггера
insert into public.balance_ledger (user_id, amount, balance_after, kind, trade_id, note)
select
  t.buyer_id,
  -round(t.fee_amount / 2, 4),
  p.balance,
  'trade_fee',
  t.id,
  'F1 backfill buyer fee'
from public.trades t
join public.profiles p on p.id = t.buyer_id
where coalesce(t.fee_amount, 0) > 0
  and not exists (
    select 1
    from public.balance_ledger l
    where l.trade_id = t.id
      and l.user_id = t.buyer_id
      and l.kind = 'trade_fee'
  );

insert into public.balance_ledger (user_id, amount, balance_after, kind, trade_id, note)
select
  t.seller_id,
  -round(t.fee_amount / 2, 4),
  p.balance,
  'trade_fee',
  t.id,
  'F1 backfill seller fee'
from public.trades t
join public.profiles p on p.id = t.seller_id
where coalesce(t.fee_amount, 0) > 0
  and not exists (
    select 1
    from public.balance_ledger l
    where l.trade_id = t.id
      and l.user_id = t.seller_id
      and l.kind = 'trade_fee'
  );

create or replace function public.get_my_wallet_summary()
returns table (
  balance numeric,
  held numeric,
  available numeric,
  ledger_ok boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance numeric;
  v_held numeric;
  v_ledger_sum numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select p.balance into v_balance from public.profiles p where p.id = v_user_id;

  select coalesce(sum(w.amount), 0) into v_held
  from public.withdrawal_requests w
  where w.user_id = v_user_id
    and w.status in ('pending', 'approved');

  -- trade_fee — зеркало удержаний при сделках, не участвует в сверке кошелька
  select coalesce(sum(l.amount), 0) into v_ledger_sum
  from public.balance_ledger l
  where l.user_id = v_user_id
    and l.kind not in ('trade_fee');

  return query
  select
    v_balance,
    v_held,
    v_balance as available,
    abs(v_balance - v_ledger_sum) < 0.0001 as ledger_ok;
end;
$$;

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

grant execute on function public.admin_platform_fee_summary() to authenticated;
