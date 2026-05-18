import type { MarketOutcome } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export function formatOutcomeLabel(
  outcomeKey: string,
  label?: string | null,
): string {
  if (label) return label;
  if (outcomeKey === "yes") return "Да";
  if (outcomeKey === "no") return "Нет";
  return outcomeKey;
}

export async function getMarketOutcomes(
  supabase: SupabaseClient,
  marketId: string,
): Promise<MarketOutcome[]> {
  const { data, error } = await supabase
    .from("market_outcomes")
    .select("outcome_key, label, sort_order")
    .eq("market_id", marketId)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    outcome_key: row.outcome_key as string,
    label: row.label as string,
    sort_order: Number(row.sort_order),
  }));
}

export async function getOutcomePrice(
  supabase: SupabaseClient,
  marketId: string,
  outcomeKey: string,
): Promise<number> {
  const { data: trades } = await supabase
    .from("trades")
    .select("price, side, created_at")
    .eq("market_id", marketId)
    .eq("side", outcomeKey)
    .order("created_at", { ascending: false })
    .limit(20);

  if (trades && trades.length > 0) {
    const sum = trades.reduce((a, t) => a + Number(t.price), 0);
    return Math.round((sum / trades.length) * 100) / 100;
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("direction, price")
    .eq("market_id", marketId)
    .eq("status", "open")
    .eq("side", outcomeKey);

  if (!orders?.length) return 0.5;

  const bids = orders
    .filter((o) => o.direction === "buy")
    .map((o) => Number(o.price));
  const asks = orders
    .filter((o) => o.direction === "sell")
    .map((o) => Number(o.price));

  const bestBid = bids.length ? Math.max(...bids) : 0;
  const bestAsk = asks.length ? Math.min(...asks) : 1;

  if (bestBid > 0 && bestAsk < 1) {
    return Math.round(((bestBid + bestAsk) / 2) * 100) / 100;
  }
  if (bestBid > 0) return bestBid;
  if (bestAsk < 1) return bestAsk;
  return 0.5;
}

export async function getOutcomePrices(
  supabase: SupabaseClient,
  marketId: string,
  outcomes: MarketOutcome[],
): Promise<Record<string, number>> {
  const entries = await Promise.all(
    outcomes.map(async (o) => [
      o.outcome_key,
      await getOutcomePrice(supabase, marketId, o.outcome_key),
    ] as const),
  );
  return Object.fromEntries(entries);
}

export function resolvedOutcomeKey(market: {
  resolved_outcome_key?: string | null;
  resolved_side?: string | null;
}): string | null {
  return market.resolved_outcome_key ?? market.resolved_side ?? null;
}
