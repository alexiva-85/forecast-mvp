import type { SupabaseClient } from "@supabase/supabase-js";
import { parseActivityRows } from "@/lib/activity";
import { getOutcomeLabelMapsByMarketId } from "@/lib/outcomes";
import { parseWithdrawalRows } from "@/lib/wallet";

export async function fetchAccountProfile(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchUserPositions(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("positions")
    .select(
      "*, markets(id, slug, title, status, resolved_side, resolved_outcome_key)",
    )
    .eq("user_id", userId)
    .gt("shares", 0);

  if (error) throw error;
  return data ?? [];
}

export async function fetchUserOpenOrders(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, markets(slug, title)")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchUserActivity(
  supabase: SupabaseClient,
  limit = 100,
) {
  const { data, error } = await supabase.rpc("list_my_activity", {
    p_limit: limit,
  });
  if (error) throw error;
  return parseActivityRows(data);
}

export async function fetchUserWithdrawalRequests(
  supabase: SupabaseClient,
  limit = 50,
) {
  const { data, error } = await supabase.rpc("list_my_withdrawal_requests", {
    p_limit: limit,
  });
  if (error) throw error;
  return parseWithdrawalRows(data);
}

export async function buildOutcomeLabelsBySlug(
  supabase: SupabaseClient,
  marketIds: string[],
): Promise<{
  byMarketId: Record<string, Record<string, string>>;
  bySlug: Record<string, Record<string, string>>;
}> {
  const byMarketId = await getOutcomeLabelMapsByMarketId(supabase, marketIds);
  const bySlug: Record<string, Record<string, string>> = {};

  const ids = Object.keys(byMarketId);
  if (ids.length === 0) {
    return { byMarketId, bySlug };
  }

  const { data: markets, error } = await supabase
    .from("markets")
    .select("id, slug")
    .in("id", ids);

  if (error) throw error;

  for (const market of markets ?? []) {
    const labels = byMarketId[market.id];
    if (labels) bySlug[market.slug] = labels;
  }

  return { byMarketId, bySlug };
}

export function collectMarketIdsFromAccountData(options: {
  positions?: { market_id: string }[];
  orders?: { market_id: string }[];
  activitySlugs?: string[];
}): string[] {
  const ids = new Set<string>();
  for (const position of options.positions ?? []) {
    ids.add(position.market_id);
  }
  for (const order of options.orders ?? []) {
    ids.add(order.market_id);
  }
  return [...ids];
}

export async function resolveActivityMarketIds(
  supabase: SupabaseClient,
  activitySlugs: string[],
  existingIds: string[],
): Promise<string[]> {
  const ids = new Set(existingIds);
  if (activitySlugs.length === 0) return [...ids];

  const { data: markets, error } = await supabase
    .from("markets")
    .select("id")
    .in("slug", activitySlugs);

  if (error) throw error;
  for (const market of markets ?? []) {
    ids.add(market.id);
  }
  return [...ids];
}
