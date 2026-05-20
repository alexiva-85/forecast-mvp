import type { SupabaseClient } from "@supabase/supabase-js";

export interface PlatformSettings {
  tradeFeeRate: number;
  feeBalance: number;
}

export interface PlatformFeeReconcile {
  tradeFeeRate: number;
  feeBalance: number;
  tradesFeeTotal: number;
  ledgerFeeTotal: number;
  ledgerReconcileOk: boolean;
  balanceReconcileOk: boolean;
}

const DEFAULT_FEE_RATE = 0.01;

export async function getPlatformSettings(
  supabase: SupabaseClient,
): Promise<PlatformSettings> {
  const { data } = await supabase
    .from("platform_settings")
    .select("trade_fee_rate, fee_balance")
    .eq("id", 1)
    .maybeSingle();

  return {
    tradeFeeRate: Number(data?.trade_fee_rate ?? DEFAULT_FEE_RATE),
    feeBalance: Number(data?.fee_balance ?? 0),
  };
}

export function formatFeePercent(rate: number): string {
  return `${(rate * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

/** Полная комиссия с оборота сделки (делится 50/50 между сторонами). */
export function estimateTradeFee(notional: number, rate: number): number {
  return Math.round(notional * rate * 10000) / 10000;
}

/** Доля одной стороны при исполнении. */
export function estimateSideFee(notional: number, rate: number): number {
  return estimateTradeFee(notional, rate) / 2;
}

export async function fetchPlatformFeeReconcile(
  supabase: SupabaseClient,
): Promise<PlatformFeeReconcile | null> {
  const { data, error } = await supabase.rpc("admin_platform_fee_summary");
  if (error) return null;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;

  const r = row as Record<string, unknown>;
  return {
    tradeFeeRate: Number(r.trade_fee_rate ?? DEFAULT_FEE_RATE),
    feeBalance: Number(r.fee_balance ?? 0),
    tradesFeeTotal: Number(r.trades_fee_total ?? 0),
    ledgerFeeTotal: Number(r.ledger_fee_total ?? 0),
    ledgerReconcileOk: Boolean(r.ledger_reconcile_ok),
    balanceReconcileOk: Boolean(r.balance_reconcile_ok),
  };
}
