/**
 * E6 — UMA CTF Adapter (testnet reference).
 * Off-chain admin resolve остаётся источником истины для виртуального USD (MVP).
 * On-chain — параллельный контур через uma-ctf-adapter v3.1.0 на Amoy.
 */

export const UMA_ADAPTER_VERSION = "uma-ctf-adapter-v3.1.0" as const;

/** Статус on-chain резолва (колонка markets.onchain_resolve_status). */
export type OnchainResolveStatus =
  | "none"
  | "pending_uma"
  | "ready_onchain"
  | "resolved_onchain"
  | "skipped";

export const ONCHAIN_RESOLVE_STATUS_LABELS: Record<OnchainResolveStatus, string> = {
  none: "Не привязан к on-chain",
  pending_uma: "Ожидает UMA (optimistic oracle)",
  ready_onchain: "Можно вызвать resolve() на adapter",
  resolved_onchain: "Зафиксирован on-chain",
  skipped: "On-chain резолв не требуется",
};

export interface MarketOnchainLink {
  onchain_condition_id: string | null;
  onchain_question_id: string | null;
  onchain_adapter_version: string | null;
  onchain_init_tx_hash: string | null;
  onchain_init_at: string | null;
  onchain_resolve_status: OnchainResolveStatus;
  onchain_resolve_tx_hash: string | null;
  onchain_resolve_at: string | null;
  onchain_resolve_note: string | null;
}

const HEX32 = /^0x[a-fA-F0-9]{64}$/;
const HEX_TX = /^0x[a-fA-F0-9]{64}$/i;

export function isBytes32Hex(value: string): boolean {
  return HEX32.test(value);
}

export function isTxHashHex(value: string): boolean {
  return HEX_TX.test(value);
}

/**
 * Для binary UMA adapter: p2 = первый исход в ancillary (обычно «Да»), p1 = второй («Нет»).
 * Возвращает индекс payout (0 или 1) для выбранного outcome_key.
 */
export function binaryPayoutIndexForOutcome(
  outcomeKey: string,
  outcomes: { outcome_key: string; sort_order: number }[],
): number | null {
  if (outcomes.length < 2) return null;
  const sorted = [...outcomes].sort((a, b) => a.sort_order - b.sort_order);
  const idx = sorted.findIndex((o) => o.outcome_key === outcomeKey);
  if (idx < 0 || idx > 1) return null;
  // SDK buildResolutionData: p2 = outcomes[0], p1 = outcomes[1]
  return idx === 0 ? 1 : 0;
}

/** Подсказка для оператора после off-chain резолва. */
export function onchainResolveHint(status: OnchainResolveStatus): string {
  switch (status) {
    case "none":
      return "Привяжите conditionId с testnet (npm run onchain:uma:init) или пропустите on-chain.";
    case "pending_uma":
      return "Дождитесь liveness UMA (~2 ч), затем вызовите resolve() через скрипт или кошелёк.";
    case "ready_onchain":
      return "UMA data доступна — выполните resolve() на UmaCtfAdapter (см. docs/onchain/E6.md).";
    case "resolved_onchain":
      return "On-chain резолв отмечен в системе.";
    case "skipped":
      return "Рынок без on-chain settlement (только off-chain MVP).";
  }
}
