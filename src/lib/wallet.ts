export type WithdrawalMethod = "bank" | "card" | "crypto";

export type WithdrawalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled";

export type WithdrawalRequestRow = {
  id: string;
  amount: number;
  method: WithdrawalMethod;
  details: string | null;
  status: WithdrawalStatus;
  created_at: string;
  reviewed_at: string | null;
};

const METHOD_LABELS: Record<WithdrawalMethod, string> = {
  bank: "Банковский перевод",
  card: "Карта",
  crypto: "Криптовалюта",
};

const STATUS_LABELS: Record<WithdrawalStatus, string> = {
  pending: "На рассмотрении",
  approved: "Одобена",
  rejected: "Отклонена",
  completed: "Выплачена",
  cancelled: "Отменена",
};

export function withdrawalMethodLabel(method: WithdrawalMethod): string {
  return METHOD_LABELS[method] ?? method;
}

export function withdrawalStatusLabel(status: WithdrawalStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function formatUsdAmount(amount: number): string {
  return Number(amount).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseWithdrawalRows(
  data: unknown,
): WithdrawalRequestRow[] {
  if (!Array.isArray(data)) return [];

  return data.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      amount: Number(r.amount),
      method: r.method as WithdrawalMethod,
      details: r.details != null ? String(r.details) : null,
      status: r.status as WithdrawalStatus,
      created_at: String(r.created_at),
      reviewed_at: r.reviewed_at != null ? String(r.reviewed_at) : null,
    };
  });
}
