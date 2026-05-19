import type { SupabaseClient } from "@supabase/supabase-js";

export type KycStatus = "none" | "pending" | "verified" | "rejected";

export interface AdminUserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  balance: number;
  is_admin: boolean;
  trading_blocked: boolean;
  kyc_status: KycStatus;
  moderation_note: string | null;
  rate_limit_multiplier: number;
  created_at: string;
}

export function kycStatusLabel(status: KycStatus): string {
  switch (status) {
    case "none":
      return "Не начата";
    case "pending":
      return "На проверке";
    case "verified":
      return "Подтверждена";
    case "rejected":
      return "Отклонена";
  }
}

export function kycStatusChipClass(status: KycStatus): string {
  switch (status) {
    case "verified":
      return "bg-emerald-500/15 text-emerald-400";
    case "pending":
      return "bg-amber-500/15 text-amber-400";
    case "rejected":
      return "bg-rose-500/15 text-rose-400";
    default:
      return "bg-zinc-700/80 text-zinc-400";
  }
}

export async function fetchAdminUsers(
  supabase: SupabaseClient,
  search?: string,
  limit = 50,
): Promise<AdminUserRow[]> {
  const { data, error } = await supabase.rpc("admin_users_list", {
    p_search: search?.trim() || null,
    p_limit: limit,
    p_offset: 0,
  });
  if (error) throw error;

  return ((data ?? []) as AdminUserRow[]).map((row) => ({
    ...row,
    balance: Number(row.balance ?? 0),
    rate_limit_multiplier: Number(row.rate_limit_multiplier ?? 1),
  }));
}
