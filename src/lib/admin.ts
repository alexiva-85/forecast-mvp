import type { SupabaseClient } from "@supabase/supabase-js";
import type { Market, MarketStatus } from "@/lib/types";
import { parseChecklist, parseTags } from "@/lib/types";
import { refreshExpiredMarkets } from "@/lib/markets";

export type AdminMarketTab =
  | "all"
  | "drafts"
  | "active"
  | "closing_soon"
  | "needs_resolve"
  | "resolved"
  | "archive"
  | "sandbox";

/** Завершённые рынки старше этого порога попадают во вкладку «Архив» (A6). */
export const ADMIN_MARKET_ARCHIVE_DAYS = 30;

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

function isArchivedResolvedMarket(market: Market): boolean {
  if (market.status !== "resolved") return false;
  const resolvedAt = market.resolved_at
    ? new Date(market.resolved_at).getTime()
    : null;
  if (resolvedAt == null) return false;
  const ageMs = Date.now() - resolvedAt;
  return ageMs > ADMIN_MARKET_ARCHIVE_DAYS * 24 * 60 * 60 * 1000;
}

export function adminStatusLabel(status: MarketStatus): string {
  switch (status) {
    case "draft":
      return "Черновик";
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
    case "draft":
      return "bg-sky-500/15 text-sky-400";
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
      return !market.is_sandbox && market.status !== "draft";
    case "drafts":
      return !market.is_sandbox && market.status === "draft";
    case "active":
      return !market.is_sandbox && market.status === "open";
    case "closing_soon":
      return !market.is_sandbox && closingSoon;
    case "needs_resolve":
      return !market.is_sandbox && market.status === "closed";
    case "resolved":
      return (
        !market.is_sandbox &&
        market.status === "resolved" &&
        !isArchivedResolvedMarket(market)
      );
    case "archive":
      return !market.is_sandbox && isArchivedResolvedMarket(market);
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
    "drafts",
    "active",
    "closing_soon",
    "needs_resolve",
    "resolved",
    "archive",
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

export type AdminVolumePeriod = "24h" | "7d" | "30d";

export interface AdminPlatformVolume {
  volume_24h: number;
  volume_7d: number;
  volume_30d: number;
  trades_24h: number;
  trades_7d: number;
  trades_30d: number;
}

export interface AdminTopMarketRow {
  market_id: string;
  slug: string;
  title: string;
  category: string;
  volume_usd: number;
  trade_count: number;
}

export interface AdminResolveReminder {
  count: number;
  staleCount: number;
}

const VOLUME_PERIOD_DAYS: Record<AdminVolumePeriod, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
};

const EMPTY_PLATFORM_VOLUME: AdminPlatformVolume = {
  volume_24h: 0,
  volume_7d: 0,
  volume_30d: 0,
  trades_24h: 0,
  trades_7d: 0,
  trades_30d: 0,
};

type AdminPlatformVolumeRow = {
  volume_24h: number | string | null;
  volume_7d: number | string | null;
  volume_30d: number | string | null;
  trades_24h: number | string | null;
  trades_7d: number | string | null;
  trades_30d: number | string | null;
};

type AdminTopMarketVolumeRow = {
  market_id: string;
  slug: string;
  title: string;
  category: string;
  volume_usd: number | string | null;
  trade_count: number | string | null;
};

type AdminAuditLogRow = {
  id: string;
  created_at: string;
  admin_id: string;
  admin_display_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_slug: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
};

export function volumePeriodLabel(period: AdminVolumePeriod): string {
  switch (period) {
    case "24h":
      return "24 часа";
    case "7d":
      return "7 дней";
    case "30d":
      return "30 дней";
  }
}

export async function fetchAdminPlatformVolume(
  supabase: SupabaseClient,
): Promise<AdminPlatformVolume> {
  const { data, error } = await supabase.rpc("admin_platform_volume");
  if (error) throw error;

  const row = (data?.[0] ?? null) as AdminPlatformVolumeRow | null;
  if (!row) return { ...EMPTY_PLATFORM_VOLUME };

  return {
    volume_24h: Number(row.volume_24h ?? 0),
    volume_7d: Number(row.volume_7d ?? 0),
    volume_30d: Number(row.volume_30d ?? 0),
    trades_24h: Number(row.trades_24h ?? 0),
    trades_7d: Number(row.trades_7d ?? 0),
    trades_30d: Number(row.trades_30d ?? 0),
  };
}

export async function fetchAdminTopMarkets(
  supabase: SupabaseClient,
  period: AdminVolumePeriod,
  limit = 5,
): Promise<AdminTopMarketRow[]> {
  const { data, error } = await supabase.rpc("admin_top_markets_by_volume", {
    p_days: VOLUME_PERIOD_DAYS[period],
    p_limit: limit,
  });
  if (error) throw error;

  const rows = (data ?? []) as AdminTopMarketVolumeRow[];
  return rows.map((row) => ({
    market_id: row.market_id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    volume_usd: Number(row.volume_usd ?? 0),
    trade_count: Number(row.trade_count ?? 0),
  }));
}

export async function fetchAdminTopMarketsByPeriod(
  supabase: SupabaseClient,
  limit = 5,
): Promise<Record<AdminVolumePeriod, AdminTopMarketRow[]>> {
  const periods: AdminVolumePeriod[] = ["24h", "7d", "30d"];
  const lists = await Promise.all(
    periods.map((p) => fetchAdminTopMarkets(supabase, p, limit)),
  );
  return Object.fromEntries(
    periods.map((p, i) => [p, lists[i]]),
  ) as Record<AdminVolumePeriod, AdminTopMarketRow[]>;
}

export interface AdminAuditLogEntry {
  id: string;
  created_at: string;
  admin_id: string;
  admin_display_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_slug: string | null;
  summary: string;
  metadata: Record<string, unknown>;
}

export function adminAuditActionLabel(action: string): string {
  switch (action) {
    case "market.create":
      return "Создание рынка";
    case "market.resolve":
      return "Резолв";
    case "market.close":
      return "Закрытие торгов";
    case "market.publish":
      return "В каталог";
    case "market.publish_draft":
      return "Опубликован";
    case "market.update":
      return "Редактирование рынка";
    case "user.grant_test_shares":
      return "Тестовые доли";
    case "user.update":
      return "Пользователь";
    case "platform.set_fee_rate":
      return "Комиссия";
    case "report.update":
      return "Жалоба";
    default:
      return action;
  }
}

export async function fetchAdminAuditLog(
  supabase: SupabaseClient,
  limit = 50,
  offset = 0,
): Promise<AdminAuditLogEntry[]> {
  const { data, error } = await supabase.rpc("admin_audit_log_list", {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;

  const rows = (data ?? []) as AdminAuditLogRow[];
  return rows.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    admin_id: row.admin_id,
    admin_display_name: row.admin_display_name ?? null,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id ?? null,
    entity_slug: row.entity_slug ?? null,
    summary: row.summary,
    metadata: row.metadata ?? {},
  }));
}

export interface AdminFeeRateHistoryEntry {
  id: string;
  created_at: string;
  admin_id: string;
  admin_display_name: string | null;
  summary: string;
  old_rate: number;
  new_rate: number;
}

type AdminFeeRateHistoryRow = {
  id: string;
  created_at: string;
  admin_id: string;
  admin_display_name: string | null;
  summary: string;
  old_rate: number | string | null;
  new_rate: number | string | null;
};

export async function fetchAdminFeeRateHistory(
  supabase: SupabaseClient,
  limit = 30,
): Promise<AdminFeeRateHistoryEntry[]> {
  const { data, error } = await supabase.rpc("admin_fee_rate_history_list", {
    p_limit: limit,
  });
  if (error) throw error;

  return ((data ?? []) as AdminFeeRateHistoryRow[]).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    admin_id: row.admin_id,
    admin_display_name: row.admin_display_name ?? null,
    summary: row.summary,
    old_rate: Number(row.old_rate ?? 0),
    new_rate: Number(row.new_rate ?? 0),
  }));
}

export async function fetchAdminPendingReportsCount(
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase.rpc("admin_pending_reports_count");
  if (error) throw error;
  return Number(data ?? 0);
}

export async function fetchAdminResolveReminder(
  supabase: SupabaseClient,
): Promise<AdminResolveReminder> {
  await refreshExpiredMarkets(supabase);

  const { data, error } = await supabase
    .from("markets")
    .select("closes_at, is_sandbox")
    .eq("status", "closed");

  if (error) throw error;

  const closed = (data ?? []).filter((m) => !(m.is_sandbox ?? false));
  const now = Date.now();
  const staleMs = 7 * 24 * 60 * 60 * 1000;

  let staleCount = 0;
  for (const m of closed) {
    if (!m.closes_at) continue;
    if (now - new Date(m.closes_at).getTime() > staleMs) staleCount += 1;
  }

  return { count: closed.length, staleCount };
}
