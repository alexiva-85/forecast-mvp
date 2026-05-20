/**
 * Мост admin resolve (off-chain) ↔ UMA CTF Adapter (on-chain).
 * Автоматический tx в MVP не выполняется — только статусы и инструкции.
 */

import type { MarketOutcome } from "@/lib/types";
import {
  binaryPayoutIndexForOutcome,
  type MarketOnchainLink,
  type OnchainResolveStatus,
} from "@/lib/onchain/uma";

export type ResolveBridgeStep =
  | "offchain_done"
  | "await_uma"
  | "call_adapter_resolve"
  | "onchain_done"
  | "not_linked";

export interface ResolveBridgeState {
  step: ResolveBridgeStep;
  status: OnchainResolveStatus;
  payoutIndex: number | null;
  conditionId: string | null;
  hint: string;
}

export function buildResolveBridgeState(
  link: MarketOnchainLink,
  resolvedOutcomeKey: string | null,
  outcomes: MarketOutcome[],
): ResolveBridgeState {
  const status = link.onchain_resolve_status;
  const conditionId = link.onchain_condition_id;
  const payoutIndex =
    resolvedOutcomeKey != null
      ? binaryPayoutIndexForOutcome(resolvedOutcomeKey, outcomes)
      : null;

  if (!conditionId || status === "skipped" || status === "none") {
    return {
      step: "not_linked",
      status,
      payoutIndex,
      conditionId,
      hint:
        "Виртуальный резолв в БД — источник истины для MVP. On-chain не привязан.",
    };
  }

  if (status === "resolved_onchain") {
    return {
      step: "onchain_done",
      status,
      payoutIndex,
      conditionId,
      hint: "Off-chain и on-chain резолв согласованы (вручную).",
    };
  }

  if (status === "ready_onchain") {
    return {
      step: "call_adapter_resolve",
      status,
      payoutIndex,
      conditionId,
      hint: `Вызовите UmaCtfAdapter.resolve(questionId). Payout index: ${payoutIndex ?? "?"}`,
    };
  }

  if (status === "pending_uma") {
    return {
      step: "await_uma",
      status,
      payoutIndex,
      conditionId,
      hint:
        "После off-chain резолва UMA должен подтвердить исход. Затем resolve() на adapter.",
    };
  }

  return {
    step: "not_linked",
    status,
    payoutIndex,
    conditionId,
    hint: "Привяжите condition перед резолвом или отметьте «без on-chain».",
  };
}

/** После успешного admin_resolve_market: какой onchain_resolve_status выставить. */
export function onchainStatusAfterOffchainResolve(
  link: Pick<MarketOnchainLink, "onchain_condition_id" | "onchain_resolve_status">,
): OnchainResolveStatus {
  if (link.onchain_resolve_status === "skipped") {
    return "skipped";
  }
  if (!link.onchain_condition_id) {
    return "none";
  }
  if (link.onchain_resolve_status === "resolved_onchain") {
    return "resolved_onchain";
  }
  return "pending_uma";
}
