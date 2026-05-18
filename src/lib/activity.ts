export type ActivityEventType =
  | "trade_buy"
  | "trade_sell"
  | "order_cancelled"
  | "redeem";

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

const TYPE_LABELS: Record<ActivityEventType, string> = {
  trade_buy: "Покупка",
  trade_sell: "Продажа",
  order_cancelled: "Отмена ордера",
  redeem: "Выплата",
};

export function activityTypeLabel(type: ActivityEventType): string {
  return TYPE_LABELS[type] ?? type;
}

export function formatActivityDetail(row: ActivityRow): string {
  const outcome =
    row.side === "yes" ? "Да" : row.side === "no" ? "Нет" : null;

  switch (row.event_type) {
    case "trade_buy":
    case "trade_sell":
      if (row.price != null && row.size != null && outcome) {
        return `${outcome} · ${row.size} @ ${(row.price * 100).toFixed(0)}¢`;
      }
      return outcome ?? "Сделка";
    case "order_cancelled":
      if (row.price != null && row.size != null && outcome) {
        const dir = row.direction === "buy" ? "покупка" : "продажа";
        return `${dir} ${outcome} · ${row.size} @ ${(row.price * 100).toFixed(0)}¢`;
      }
      return "Ордер снят";
    case "redeem":
      return "Выигрышные доли";
    default:
      return "";
  }
}

export function formatActivityAmount(amount: number | null): string {
  if (amount == null) return "—";
  const sign = amount >= 0 ? "+" : "";
  return `${sign}$${amount.toFixed(2)}`;
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
