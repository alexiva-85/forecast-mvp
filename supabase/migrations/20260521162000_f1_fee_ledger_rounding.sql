-- F1: точное разбиение fee 50/50 (без потери центов на округлении)

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

delete from public.balance_ledger where kind = 'trade_fee';

insert into public.balance_ledger (user_id, amount, balance_after, kind, trade_id, note)
select
  t.buyer_id,
  -round(t.fee_amount / 2, 4),
  p.balance,
  'trade_fee',
  t.id,
  'F1 buyer fee'
from public.trades t
join public.profiles p on p.id = t.buyer_id
where coalesce(t.fee_amount, 0) > 0;

insert into public.balance_ledger (user_id, amount, balance_after, kind, trade_id, note)
select
  t.seller_id,
  -(t.fee_amount - round(t.fee_amount / 2, 4)),
  p.balance,
  'trade_fee',
  t.id,
  'F1 seller fee'
from public.trades t
join public.profiles p on p.id = t.seller_id
where coalesce(t.fee_amount, 0) > 0;
