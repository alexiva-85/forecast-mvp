import type { WithdrawalMethod, WithdrawalStatus } from "@/lib/wallet";
import {
  withdrawalMethodLabel,
  withdrawalStatusLabel,
} from "@/lib/wallet";

export type AdminWithdrawalRequest = {
  id: string;
  user_id: string;
  user_email: string | null;
  user_display_name: string | null;
  amount: number;
  method: WithdrawalMethod;
  details: string | null;
  status: WithdrawalStatus;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewer_display_name: string | null;
};

export type WalletReconcileRow = {
  user_id: string;
  profile_balance: number;
  ledger_sum: number;
  held_withdrawals: number;
  matches: boolean;
};

export function parseAdminWithdrawalRows(data: unknown): AdminWithdrawalRequest[] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      user_id: String(r.user_id),
      user_email: r.user_email != null ? String(r.user_email) : null,
      user_display_name:
        r.user_display_name != null ? String(r.user_display_name) : null,
      amount: Number(r.amount),
      method: r.method as WithdrawalMethod,
      details: r.details != null ? String(r.details) : null,
      status: r.status as WithdrawalStatus,
      admin_note: r.admin_note != null ? String(r.admin_note) : null,
      created_at: String(r.created_at),
      reviewed_at: r.reviewed_at != null ? String(r.reviewed_at) : null,
      reviewer_display_name:
        r.reviewer_display_name != null
          ? String(r.reviewer_display_name)
          : null,
    };
  });
}

export function parseWalletReconcileRows(data: unknown): WalletReconcileRow[] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      user_id: String(r.user_id),
      profile_balance: Number(r.profile_balance),
      ledger_sum: Number(r.ledger_sum),
      held_withdrawals: Number(r.held_withdrawals),
      matches: Boolean(r.matches),
    };
  });
}

export function adminWithdrawalStatusLabel(status: WithdrawalStatus): string {
  return withdrawalStatusLabel(status);
}

export function adminWithdrawalMethodLabel(method: WithdrawalMethod): string {
  return withdrawalMethodLabel(method);
}
