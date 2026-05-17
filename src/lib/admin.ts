import type { SupabaseClient } from "@supabase/supabase-js";
import type { Market, MarketStatus } from "@/lib/types";
import { parseChecklist, parseTags } from "@/lib/types";
import { refreshExpiredMarkets } from "@/lib/markets";

export type AdminMarketTab =
  | "all"
  | "active"
  | "closing_soon"
  | "needs_resolve"
  | "resolved"
  | "sandbox";

export interface AdminMarketStats {
  trade_count: number;
  volume_usd: number;
  open_orders: number;
}

export interface AdminMarket extends Market {
  stats: AdminMarketStats;
}

export interface AdminActionItem {
  kind:
    | "needs_resolve"
    | "missing_rules"
    | "missing_closes_at"
    | "stale_resolve"
    | "sandbox_in_catalog";
  market: AdminMarket;
  label: string;
}

export interface AdminOverview {
  counts: {
    active: number;
    needsResolve: number;
    resolved: number;
    sandbox: number;
    missingRules: number;
    missingClosesAt: number;
  };
  actions: AdminActionItem[];
  sandboxUnresolved: number;
}

const MAX_OVERVIEW_ACTIONS = 5;

const CLOSING_SOON_DAYS = 14;

export function adminStatusLabel(status: MarketStatus): string {
  switch (status) {
    case "open":
      return "Активен";
    case "closed":
      return "Ожидает резолва";
    case "resolved":
      return "Завершён";
  }
}

export function adminStatusChipClass(status: MarketStatus): string {
  switch (status) {
    case "open":
      return "bg-emerald-500/15 text-emerald-400";
    case "closed":
      return "bg-amber-500/15 text-amber-400";
    case "resolved":
      return "bg-zinc-700/80 text-zinc-300";
  }
}

export function sandboxBadgeClass(): string {
  return "bg-zinc-700/60 text-zinc-400";
}

export function actionKindMeta(kind: AdminActionItem["kind"]): {
  tag: string;
  tagClass: string;
  labelClass: string;
} {
  switch (kind) {
    case "needs_resolve":
    case "stale_resolve":
      return {
        tag: "Резолв",
        tagClass: "bg-amber-500/20 text-amber-400",
        labelClass: "text-amber-200/90",
      };
    case "missing_rules":
      return {
        tag: "Проверка",
        tagClass: "bg-rose-500/20 text-rose-400",
        labelClass: "text-rose-300/90",
      };
    case "missing_closes_at":
      return {
        tag: "Проверка",
        tagClass: "bg-rose-500/15 text-rose-300",
        labelClass: "text-rose-300/80",
      };
    default:
      return {
        tag: "Задача",
        tagClass: "bg-zinc-700 text-zinc-400",
        labelClass: "text-zinc-400",
      };
  }
}

function actionSortKey(a: AdminActionItem, b: AdminActionItem): number {
  const priority: Record<AdminActionItem["kind"], number> = {
    needs_resolve: 0,
    stale_resolve: 1,
    missing_rules: 2,
    missing_closes_at: 3,
    sandbox_in_catalog: 99,
  };
  const p = priority[a.kind] - priority[b.kind];
  if (p !== 0) return p;

  const resolveKinds = new Set<AdminActionItem["kind"]>([
    "needs_resolve",
    "stale_resolve",
  ]);
  if (resolveKinds.has(a.kind) && resolveKinds.has(b.kind)) {
    const volDiff = b.market.stats.volume_usd - a.market.stats.volume_usd;
    if (volDiff !== 0) return volDiff;
    return b.market.stats.trade_count - a.market.stats.trade_count;
  }

  return a.market.title.localeCompare(b.market.title, "ru");
}

export function matchesAdminTab(market: Market, tab: AdminMarketTab): boolean {
  const now = Date.now();
  const closesAt = market.closes_at ? new Date(market.closes_at).getTime() : null;
  const closingSoon =
    market.status === "open" &&
    closesAt != null &&
    closesAt > now &&
    closesAt - now <= CLOSING_SOON_DAYS * 24 * 60 * 60 * 1000;

  switch (tab) {
    case "all":
      return !market.is_sandbox;
    case "active":
      return !market.is_sandbox && market.status === "open";
    case "closing_soon":
      return !market.is_sandbox && closingSoon;
    case "needs_resolve":
      return !market.is_sandbox && market.status === "closed";
    case "resolved":
      return !market.is_sandbox && market.status === "resolved";
    case "sandbox":
      return market.is_sandbox;
  }
}

export async function fetchAdminMarkets(
  supabase: SupabaseClient,
): Promise<AdminMarket[]> {
  await refreshExpiredMarkets(supabase);

  const { data: markets, error } = await supabase
    .from("markets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const list = (markets ?? []) as Market[];
  if (list.length === 0) return [];

  const ids = list.map((m) => m.id);
  const { data: statsRows, error: statsErr } = await supabase.rpc(
    "admin_market_stats",
    { p_market_ids: ids },
  );

  if (statsErr) throw statsErr;

  const statsMap = new Map<string, AdminMarketStats>();
  for (const row of statsRows ?? []) {
    statsMap.set(row.market_id as string, {
      trade_count: Number(row.trade_count ?? 0),
      volume_usd: Number(row.volume_usd ?? 0),
      open_orders: Number(row.open_orders ?? 0),
    });
  }

  const emptyStats: AdminMarketStats = {
    trade_count: 0,
    volume_usd: 0,
    open_orders: 0,
  };

  return list.map((raw) => {
    const m = raw as Market & { is_sandbox?: boolean };
    return {
      ...m,
      is_sandbox: m.is_sandbox ?? false,
      tags: parseTags(m.tags),
      resolution_checklist: parseChecklist(m.resolution_checklist),
      stats: statsMap.get(m.id) ?? emptyStats,
    };
  });
}

export function countMarketsByTab(
  markets: AdminMarket[],
): Record<AdminMarketTab, number> {
  const tabs: AdminMarketTab[] = [
    "all",
    "active",
    "closing_soon",
    "needs_resolve",
    "resolved",
    "sandbox",
  ];
  return Object.fromEntries(
    tabs.map((t) => [t, markets.filter((m) => matchesAdminTab(m, t)).length]),
  ) as Record<AdminMarketTab, number>;
}

export function buildAdminOverview(markets: AdminMarket[]): AdminOverview {
  const production = markets.filter((m) => !m.is_sandbox);
  const actions: AdminActionItem[] = [];

  for (const market of markets) {
    if (market.status === "closed" && !market.is_sandbox) {
      actions.push({
        kind: "needs_resolve",
        market,
        label: "Торги закрыты — нужен резолв",
      });
    }

    if (
      market.status === "open" &&
      !market.is_sandbox &&
      (!market.resolution_rules?.trim() ||
        !market.resolution_checklist?.length)
    ) {
      actions.push({
        kind: "missing_rules",
        market,
        label: "Нет правил или чеклиста резолва",
      });
    }

    if (market.status === "open" && !market.is_sandbox && !market.closes_at) {
      actions.push({
        kind: "missing_closes_at",
        market,
        label: "Не указана дата закрытия торгов",
      });
    }

    if (market.status === "closed" && market.closes_at) {
      const closedFor = Date.now() - new Date(market.closes_at).getTime();
      if (closedFor > 7 * 24 * 60 * 60 * 1000) {
        actions.push({
          kind: "stale_resolve",
          market,
          label: "Долго ждёт резолва (>7 дней с даты закрытия)",
        });
      }
    }
  }

  actions.sort((a, b) => actionSortKey(a, b));

  return {
    counts: {
      active: production.filter((m) => m.status === "open").length,
      needsResolve: production.filter((m) => m.status === "closed").length,
      resolved: production.filter((m) => m.status === "resolved").length,
      sandbox: markets.filter((m) => m.is_sandbox).length,
      missingRules: production.filter(
        (m) =>
          m.status === "open" &&
          (!m.resolution_rules?.trim() || !m.resolution_checklist?.length),
      ).length,
      missingClosesAt: production.filter(
        (m) => m.status === "open" && !m.closes_at,
      ).length,
    },
    actions: actions.slice(0, MAX_OVERVIEW_ACTIONS),
    sandboxUnresolved: markets.filter(
      (m) => m.is_sandbox && m.status !== "resolved",
    ).length,
  };
}

export function filterAdminMarkets(
  markets: AdminMarket[],
  tab: AdminMarketTab,
  q?: string,
  category?: string,
): AdminMarket[] {
  let list = markets.filter((m) => matchesAdminTab(m, tab));

  if (category && category !== "all") {
    list = list.filter((m) => m.category === category);
  }

  if (q?.trim()) {
    const term = q.trim().toLowerCase();
    list = list.filter(
      (m) =>
        m.title.toLowerCase().includes(term) ||
        m.slug.toLowerCase().includes(term) ||
        (m.description?.toLowerCase().includes(term) ?? false),
    );
  }

  return list;
}

export function formatAdminVolume(usd: number): string {
  return `$${usd.toLocaleString("ru-RU", { maximumFractionDigits: 0 })}`;
}
