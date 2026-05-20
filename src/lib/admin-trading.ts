import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminOrderStatus = "open" | "filled" | "cancelled";

export interface AdminOrderRow {
  id: string;
  user_id: string;
  user_email: string | null;
  user_display_name: string | null;
  market_id: string;
  market_slug: string;
  market_title: string;
  side: string;
  outcome_label: string | null;
  direction: "buy" | "sell";
  price: number;
  size: number;
  remaining: number;
  status: AdminOrderStatus;
  order_kind: "limit" | "market";
  time_in_force: string;
  created_at: string;
}

export interface AdminTradeRow {
  id: string;
  market_id: string;
  market_slug: string;
  market_title: string;
  side: string;
  outcome_label: string | null;
  price: number;
  size: number;
  fee_amount: number;
  buyer_id: string;
  buyer_email: string | null;
  seller_id: string;
  seller_email: string | null;
  buy_order_id: string | null;
  sell_order_id: string | null;
  created_at: string;
}

export function orderStatusLabel(status: AdminOrderStatus): string {
  switch (status) {
    case "open":
      return "Открыта";
    case "filled":
      return "Исполнена";
    case "cancelled":
      return "Отменена";
  }
}

export function orderStatusChipClass(status: AdminOrderStatus): string {
  switch (status) {
    case "open":
      return "bg-sky-500/15 text-sky-400";
    case "filled":
      return "bg-emerald-500/15 text-emerald-400";
    case "cancelled":
      return "bg-zinc-700/80 text-zinc-400";
  }
}

export function orderKindLabel(kind: "limit" | "market"): string {
  return kind === "market" ? "Рыночная" : "Лимитная";
}

export async function fetchAdminOrders(
  supabase: SupabaseClient,
  options?: { search?: string; status?: AdminOrderStatus | null; limit?: number },
): Promise<AdminOrderRow[]> {
  const { data, error } = await supabase.rpc("admin_orders_list", {
    p_search: options?.search?.trim() || null,
    p_status: options?.status ?? null,
    p_limit: options?.limit ?? 50,
    p_offset: 0,
  });
  if (error) throw error;

  return ((data ?? []) as AdminOrderRow[]).map((row) => ({
    ...row,
    price: Number(row.price),
    size: Number(row.size),
    remaining: Number(row.remaining),
  }));
}

export async function fetchAdminTrades(
  supabase: SupabaseClient,
  options?: { search?: string; limit?: number },
): Promise<AdminTradeRow[]> {
  const { data, error } = await supabase.rpc("admin_trades_list", {
    p_search: options?.search?.trim() || null,
    p_limit: options?.limit ?? 50,
    p_offset: 0,
  });
  if (error) throw error;

  return ((data ?? []) as AdminTradeRow[]).map((row) => ({
    ...row,
    price: Number(row.price),
    size: Number(row.size),
    fee_amount: Number(row.fee_amount ?? 0),
  }));
}
