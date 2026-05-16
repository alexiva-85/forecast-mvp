import type { Market, MarketWithPrice, Trade } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getMarkets(
  supabase: SupabaseClient,
  category?: string,
): Promise<MarketWithPrice[]> {
  let query = supabase
    .from("markets")
    .select("*")
    .order("created_at", { ascending: true });

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data: markets, error } = await query;
  if (error) throw error;

  const withPrices = await Promise.all(
    (markets as Market[]).map(async (m) => ({
      ...m,
      yes_price: await getYesPrice(supabase, m.id),
    })),
  );

  return withPrices;
}

export async function getMarketBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<MarketWithPrice | null> {
  const { data, error } = await supabase
    .from("markets")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const market = data as Market;
  return {
    ...market,
    yes_price: await getYesPrice(supabase, market.id),
  };
}

export async function getYesPrice(
  supabase: SupabaseClient,
  marketId: string,
): Promise<number> {
  const { data: trades } = await supabase
    .from("trades")
    .select("price, side, created_at")
    .eq("market_id", marketId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (trades && trades.length > 0) {
    const yesTrades = (trades as Trade[]).filter((t) => t.side === "yes");
    if (yesTrades.length > 0) {
      const sum = yesTrades.reduce((a, t) => a + Number(t.price), 0);
      return Math.round((sum / yesTrades.length) * 100) / 100;
    }
    const noTrade = trades[0] as Trade;
    if (noTrade.side === "no") {
      return Math.round((1 - Number(noTrade.price)) * 100) / 100;
    }
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("side, direction, price")
    .eq("market_id", marketId)
    .eq("status", "open")
    .eq("side", "yes");

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

export function formatPrice(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

export function categoryLabel(category: string): string {
  return category === "crypto" ? "Крипто" : "Спорт";
}
