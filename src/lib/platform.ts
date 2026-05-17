import type { SupabaseClient } from "@supabase/supabase-js";

export interface PlatformSettings {
  tradeFeeRate: number;
  feeBalance: number;
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
