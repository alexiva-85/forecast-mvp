import {
  getMarketOutcomes,
  getOutcomePrice,
  getOutcomePrices,
} from "@/lib/outcomes";
import type { Market, MarketStatus, MarketWithPrice } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function refreshExpiredMarkets(supabase: SupabaseClient) {
  await supabase.rpc("close_expired_markets");
}

export type MarketListFilters = {
  category?: string;
  q?: string;
  tag?: string;
};

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

export async function getPopularTags(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data } = await supabase
    .from("markets")
    .select("tags")
    .eq("is_sandbox", false)
    .neq("status", "draft");
  const counts = new Map<string, number>();

  for (const row of data ?? []) {
    for (const tag of (row.tags as string[]) ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .slice(0, 12);
}

export async function getMarkets(
  supabase: SupabaseClient,
  filters: MarketListFilters = {},
): Promise<MarketWithPrice[]> {
  await refreshExpiredMarkets(supabase);

  const { category = "all", q, tag } = filters;

  let query = supabase
    .from("markets")
    .select("*")
    .eq("is_sandbox", false)
    .neq("status", "draft")
    .order("created_at", { ascending: true });

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  if (tag) {
    query = query.contains("tags", [tag.toLowerCase()]);
  }

  if (q?.trim()) {
    const term = escapeIlike(q.trim());
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const { data: markets, error } = await query;
  if (error) throw error;

  const withPrices = await Promise.all(
    (markets as Market[]).map(async (m) => enrichMarketWithPrices(supabase, m)),
  );

  return withPrices;
}

async function enrichMarketWithPrices(
  supabase: SupabaseClient,
  market: Market,
): Promise<MarketWithPrice> {
  const outcomes = await getMarketOutcomes(supabase, market.id);
  const outcome_prices = await getOutcomePrices(supabase, market.id, outcomes);
  const yes_price =
    outcome_prices.yes ?? (await getOutcomePrice(supabase, market.id, "yes"));
  const outcome_mode =
    market.outcome_mode === "multi" || outcomes.length > 2
      ? "multi"
      : "binary";
  return { ...market, outcomes, outcome_prices, yes_price, outcome_mode };
}

export async function getMarketBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<MarketWithPrice | null> {
  await refreshExpiredMarkets(supabase);

  const { data, error } = await supabase
    .from("markets")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const market = data as Market;
  return enrichMarketWithPrices(supabase, market);
}

export function formatPrice(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

export function categoryLabel(category: string): string {
  return category === "crypto" ? "Крипто" : "Спорт";
}

export function marketStatusLabel(status: MarketStatus): string {
  switch (status) {
    case "draft":
      return "Черновик";
    case "open":
      return "Открыт";
    case "closed":
      return "Торги закрыты";
    case "resolved":
      return "Завершён";
  }
}

export function formatClosesAt(closesAt: string | null): string | null {
  if (!closesAt) return null;
  return new Date(closesAt).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isMarketTradeable(market: Pick<Market, "status">): boolean {
  return market.status === "open";
}
