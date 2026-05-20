import type { Market } from "@/lib/types";
import type { MarketOnchainLink, OnchainResolveStatus } from "@/lib/onchain/uma";

export function marketOnchainLinkFromRow(
  row: Pick<
    Market,
    | "onchain_condition_id"
    | "onchain_question_id"
    | "onchain_adapter_version"
    | "onchain_init_tx_hash"
    | "onchain_init_at"
    | "onchain_resolve_status"
    | "onchain_resolve_tx_hash"
    | "onchain_resolve_at"
    | "onchain_resolve_note"
  >,
): MarketOnchainLink {
  return {
    onchain_condition_id: row.onchain_condition_id ?? null,
    onchain_question_id: row.onchain_question_id ?? null,
    onchain_adapter_version: row.onchain_adapter_version ?? null,
    onchain_init_tx_hash: row.onchain_init_tx_hash ?? null,
    onchain_init_at: row.onchain_init_at ?? null,
    onchain_resolve_status:
      (row.onchain_resolve_status as OnchainResolveStatus) ?? "none",
    onchain_resolve_tx_hash: row.onchain_resolve_tx_hash ?? null,
    onchain_resolve_at: row.onchain_resolve_at ?? null,
    onchain_resolve_note: row.onchain_resolve_note ?? null,
  };
}
