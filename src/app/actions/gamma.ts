"use server";

import { createClient } from "@/lib/supabase/server";
import {
  GAMMA_API_URL,
  flattenGammaSearchEvents,
  pickGammaIdeas,
  type GammaMarketIdea,
  type GammaRawMarket,
} from "@/lib/gamma";

const FETCH_TIMEOUT_MS = 12_000;
const DEFAULT_LIMIT = 12;

export async function fetchGammaIdeas(
  query?: string,
): Promise<{ ideas: GammaMarketIdea[] } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Войдите в аккаунт" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: "Только для администратора" };
  }

  const q = query?.trim();
  try {
    const markets = q
      ? await searchGammaMarkets(q, DEFAULT_LIMIT)
      : await listPopularGammaMarkets(DEFAULT_LIMIT);
    return { ideas: pickGammaIdeas(markets, DEFAULT_LIMIT) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gamma API недоступен";
    return { error: message };
  }
}

async function listPopularGammaMarkets(limit: number): Promise<GammaRawMarket[]> {
  const url = new URL(`${GAMMA_API_URL}/markets`);
  url.searchParams.set("active", "true");
  url.searchParams.set("closed", "false");
  url.searchParams.set("limit", String(Math.min(limit * 2, 40)));
  url.searchParams.set("order", "volumeNum");
  url.searchParams.set("ascending", "false");

  const res = await fetchWithTimeout(url.toString());
  if (!res.ok) {
    throw new Error(`Gamma: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as GammaRawMarket[];
}

async function searchGammaMarkets(q: string, limit: number): Promise<GammaRawMarket[]> {
  const url = new URL(`${GAMMA_API_URL}/public-search`);
  url.searchParams.set("q", q);
  url.searchParams.set("limit_per_type", String(Math.min(limit * 2, 24)));
  url.searchParams.set("search_tags", "true");
  url.searchParams.set("keep_closed_markets", "0");

  const res = await fetchWithTimeout(url.toString());
  if (!res.ok) {
    throw new Error(`Gamma search: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as {
    events?: Array<{ markets?: GammaRawMarket[] }>;
    markets?: GammaRawMarket[];
  };

  const fromEvents = flattenGammaSearchEvents(body.events);
  const direct = body.markets ?? [];
  return [...fromEvents, ...direct];
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 120 },
    });
  } finally {
    clearTimeout(timer);
  }
}
