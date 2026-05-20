"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  GAMMA_API_URL,
  flattenGammaSearchEvents,
  gammaDraftToCreateMarketInput,
  pickGammaIdeas,
  type GammaMarketDraft,
  type GammaMarketIdea,
  type GammaRawMarket,
} from "@/lib/gamma";

const FETCH_TIMEOUT_MS = 12_000;
const DEFAULT_LIMIT = 12;

export async function createDraftFromGamma(
  draft: GammaMarketDraft,
): Promise<{ slug: string; marketId: string } | { error: string }> {
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

  const input = gammaDraftToCreateMarketInput(draft);

  if (!input.p_title || !input.p_resolution_rules) {
    return { error: "Недостаточно данных из Gamma" };
  }
  if (input.p_resolution_checklist.length === 0) {
    return { error: "Добавьте чеклист резолва" };
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.p_slug)) {
    return { error: "Некорректный slug" };
  }

  const { data, error } = await supabase.rpc("admin_create_market", input);

  if (error) {
    return { error: mapGammaCreateError(error.message) };
  }

  const slug = input.p_slug;
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/markets");
  revalidatePath("/admin/ideas");
  revalidatePath(`/admin/markets/${slug}/edit`);
  revalidatePath(`/market/${slug}`);

  return { slug, marketId: data as string };
}

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

function mapGammaCreateError(message: string): string {
  if (message.includes("Admin only")) {
    return "Только для администратора";
  }
  if (message.includes("Invalid slug")) {
    return "Некорректный slug";
  }
  if (message.includes("duplicate key") || message.includes("markets_slug_key")) {
    return "Черновик с таким slug уже есть — откройте его в «Черновики»";
  }
  if (message.includes("Resolution rules required")) {
    return "Укажите правила резолва";
  }
  if (message.includes("Resolution checklist required")) {
    return "Добавьте хотя бы один пункт чеклиста";
  }
  return message;
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
