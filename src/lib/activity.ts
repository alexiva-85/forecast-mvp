import { formatOutcomeLabel } from "@/lib/outcomes";
import { formatSharesAtPrice } from "@/lib/portfolio-ui";

export type ActivityEventType =
  | "trade_buy"
  | "trade_sell"
  | "order_cancelled"
  | "redeem";

export type ActivityBadgeVariant = "buy" | "sell" | "payout" | "cancel";

export interface ActivityRow {
  event_id: string;
  event_at: string;
  event_type: ActivityEventType;
  market_slug: string | null;
  market_title: string | null;
  side: string | null;
  direction: string | null;
  price: number | null;
  size: number | null;
  amount: number | null;
  fee: number | null;
}

export interface ActivityViewModel {
  actionLine: string;
  badgeVariant: ActivityBadgeVariant;
  termsLine: string | null;
  marketSlug: string | null;
  marketTitle: string | null;
}

const TYPE_LABELS: Record<ActivityEventType, string> = {
  trade_buy: "Покупка",
  trade_sell: "Продажа",
  order_cancelled: "Отмена",
  redeem: "Выплата",
};

const BADGE_VARIANT: Record<ActivityEventType, ActivityBadgeVariant> = {
  trade_buy: "buy",
  trade_sell: "sell",
  order_cancelled: "cancel",
  redeem: "payout",
};

export function activityTypeLabel(type: ActivityEventType): string {
  return TYPE_LABELS[type] ?? type;
}

function outcomeLabelForRow(
  row: ActivityRow,
  outcomeLabelsBySlug?: Record<string, Record<string, string>>,
): string | null {
  if (!row.side) return null;
  const labelMap =
    row.market_slug && outcomeLabelsBySlug
      ? outcomeLabelsBySlug[row.market_slug]
      : undefined;
  return formatOutcomeLabel(row.side, labelMap?.[row.side]);
}

function buildTradeDetailLine(
  row: ActivityRow,
  outcomeLabelsBySlug?: Record<string, Record<string, string>>,
): string | null {
  const outcome = outcomeLabelForRow(row, outcomeLabelsBySlug);
  const parts: string[] = [];

  if (row.market_title) parts.push(row.market_title);
  if (outcome) parts.push(outcome);
  if (row.size != null && row.price != null) {
    parts.push(formatSharesAtPrice(row.size, row.price));
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function describeActivity(
  row: ActivityRow,
  outcomeLabelsBySlug?: Record<string, Record<string, string>>,
): ActivityViewModel {
  const badgeLabel = activityTypeLabel(row.event_type);
  const badgeVariant = BADGE_VARIANT[row.event_type];

  switch (row.event_type) {
    case "trade_buy":
    case "trade_sell":
      return {
        actionLine: badgeLabel,
        badgeVariant,
        termsLine: buildTradeDetailLine(row, outcomeLabelsBySlug),
        marketSlug: row.market_slug,
        marketTitle: row.market_title,
      };
    case "order_cancelled": {
      const outcome = outcomeLabelForRow(row, outcomeLabelsBySlug);
      const parts: string[] = [];
      if (row.market_title) parts.push(row.market_title);
      if (outcome) parts.push(outcome);
      if (row.size != null && row.price != null) {
        parts.push(formatSharesAtPrice(row.size, row.price));
      }
      return {
        actionLine: badgeLabel,
        badgeVariant,
        termsLine:
          parts.length > 0 ? parts.join(" · ") : "Заявка снята",
        marketSlug: row.market_slug,
        marketTitle: row.market_title,
      };
    }
    case "redeem": {
      const outcome = outcomeLabelForRow(row, outcomeLabelsBySlug);
      const parts: string[] = [];
      if (row.market_title) parts.push(row.market_title);
      if (outcome) parts.push(outcome);
      return {
        actionLine: badgeLabel,
        badgeVariant,
        termsLine:
          parts.length > 0
            ? parts.join(" · ")
            : "Выигрышные доли",
        marketSlug: row.market_slug,
        marketTitle: row.market_title,
      };
    }
    default:
      return {
        actionLine: badgeLabel,
        badgeVariant,
        termsLine: null,
        marketSlug: row.market_slug,
        marketTitle: row.market_title,
      };
  }
}

/** @deprecated Use describeActivity for UI; kept for tests that assert detail strings. */
export function formatActivityDetail(
  row: ActivityRow,
  outcomeLabelsBySlug?: Record<string, Record<string, string>>,
): string {
  const view = describeActivity(row, outcomeLabelsBySlug);
  if (view.termsLine) return view.termsLine;
  return view.actionLine;
}

export function formatActivityAmount(amount: number | null): string {
  if (amount == null) return "—";
  const sign = amount >= 0 ? "+" : "";
  return `${sign}$${amount.toFixed(2)}`;
}

export function activityAmountClass(amount: number | null): string {
  if (amount == null) return "text-zinc-600";
  if (amount > 0) return "text-emerald-400";
  if (amount < 0) return "text-zinc-300";
  return "text-zinc-500";
}

export function formatActivityDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function parseActivityRows(data: unknown): ActivityRow[] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => ({
    event_id: String(row.event_id),
    event_at: String(row.event_at),
    event_type: row.event_type as ActivityEventType,
    market_slug: row.market_slug ?? null,
    market_title: row.market_title ?? null,
    side: row.side ?? null,
    direction: row.direction ?? null,
    price: row.price != null ? Number(row.price) : null,
    size: row.size != null ? Number(row.size) : null,
    amount: row.amount != null ? Number(row.amount) : null,
    fee: row.fee != null ? Number(row.fee) : null,
  }));
}
