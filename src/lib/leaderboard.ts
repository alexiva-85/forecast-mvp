import type { SupabaseClient } from "@supabase/supabase-js";

export type LeaderboardPeriod = "7d" | "30d" | "all";

const PERIOD_DAYS: Record<LeaderboardPeriod, number | null> = {
  "7d": 7,
  "30d": 30,
  all: null,
};

export function parseLeaderboardPeriod(
  value: string | undefined,
): LeaderboardPeriod {
  if (value === "30d" || value === "all") return value;
  return "7d";
}

export function leaderboardPeriodLabel(period: LeaderboardPeriod): string {
  switch (period) {
    case "7d":
      return "7 дней";
    case "30d":
      return "30 дней";
    case "all":
      return "Всё время";
  }
}

export function formatLeaderboardVolume(usd: number): string {
  return `$${usd.toLocaleString("ru-RU", { maximumFractionDigits: 0 })}`;
}

export type LeaderboardSummary = {
  volume_usd: number;
  trade_count: number;
};

export type LeaderboardTraderRow = {
  rank: number;
  user_id: string;
  display_label: string;
  volume_usd: number;
  trade_count: number;
};

export type LeaderboardMarketRow = {
  rank: number;
  market_id: string;
  slug: string;
  title: string;
  category: string;
  volume_usd: number;
  trade_count: number;
};

export type LeaderboardMyRank = {
  rank: number;
  volume_usd: number;
  trade_count: number;
};

function periodDays(period: LeaderboardPeriod): number | null {
  return PERIOD_DAYS[period];
}

export async function fetchLeaderboardSummary(
  supabase: SupabaseClient,
  period: LeaderboardPeriod,
): Promise<LeaderboardSummary> {
  const { data, error } = await supabase.rpc("leaderboard_summary", {
    p_days: periodDays(period),
  });
  if (error) throw error;

  const row = data?.[0] as { volume_usd?: number; trade_count?: number } | undefined;
  return {
    volume_usd: Number(row?.volume_usd ?? 0),
    trade_count: Number(row?.trade_count ?? 0),
  };
}

export async function fetchLeaderboardTraders(
  supabase: SupabaseClient,
  period: LeaderboardPeriod,
  limit = 20,
): Promise<LeaderboardTraderRow[]> {
  const { data, error } = await supabase.rpc("leaderboard_traders", {
    p_days: periodDays(period),
    p_limit: limit,
  });
  if (error) throw error;

  return ((data ?? []) as LeaderboardTraderRow[]).map((row) => ({
    rank: Number(row.rank),
    user_id: row.user_id,
    display_label: row.display_label,
    volume_usd: Number(row.volume_usd ?? 0),
    trade_count: Number(row.trade_count ?? 0),
  }));
}

export async function fetchLeaderboardTopMarkets(
  supabase: SupabaseClient,
  period: LeaderboardPeriod,
  limit = 10,
): Promise<LeaderboardMarketRow[]> {
  const { data, error } = await supabase.rpc("leaderboard_top_markets", {
    p_days: periodDays(period),
    p_limit: limit,
  });
  if (error) throw error;

  return ((data ?? []) as LeaderboardMarketRow[]).map((row) => ({
    rank: Number(row.rank),
    market_id: row.market_id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    volume_usd: Number(row.volume_usd ?? 0),
    trade_count: Number(row.trade_count ?? 0),
  }));
}

export async function fetchLeaderboardMyRank(
  supabase: SupabaseClient,
  period: LeaderboardPeriod,
): Promise<LeaderboardMyRank | null> {
  const { data, error } = await supabase.rpc("leaderboard_my_rank", {
    p_days: periodDays(period),
  });
  if (error) throw error;

  const row = data?.[0] as LeaderboardMyRank | undefined;
  if (!row) return null;

  return {
    rank: Number(row.rank),
    volume_usd: Number(row.volume_usd ?? 0),
    trade_count: Number(row.trade_count ?? 0),
  };
}
