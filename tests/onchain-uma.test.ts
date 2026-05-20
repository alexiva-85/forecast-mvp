import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AMOY_REFERENCE,
  getUmaCtfAdapterAddress,
} from "../src/lib/onchain/addresses";
import {
  buildResolveBridgeState,
  onchainStatusAfterOffchainResolve,
} from "../src/lib/onchain/resolve-bridge";
import {
  binaryPayoutIndexForOutcome,
  isBytes32Hex,
  UMA_ADAPTER_VERSION,
} from "../src/lib/onchain/uma";

const ROOT = join(import.meta.dirname, "..");

describe("UMA adapter (E6)", () => {
  it("amoy-reference includes umaCtfAdapter v3.1.0 address", () => {
    const raw = JSON.parse(
      readFileSync(
        join(ROOT, "contracts/addresses/amoy-reference.json"),
        "utf8",
      ),
    );
    expect(raw.contracts.umaCtfAdapter).toBe(
      "0x2F6f8DA6A21023E62399801945eed1b1975A4e12",
    );
    expect(raw.oracle?.adapterVersion).toBe("v3.1.0");
  });

  it("getUmaCtfAdapterAddress matches reference on Amoy", () => {
    expect(getUmaCtfAdapterAddress()).toBe(
      AMOY_REFERENCE.contracts.umaCtfAdapter,
    );
  });

  it("validates bytes32 hex", () => {
    expect(isBytes32Hex("0x" + "a".repeat(64))).toBe(true);
    expect(isBytes32Hex("0xabc")).toBe(false);
  });

  it("maps binary outcome to payout index (SDK ancillary order)", () => {
    const outcomes = [
      { outcome_key: "yes", sort_order: 0 },
      { outcome_key: "no", sort_order: 1 },
    ];
    expect(binaryPayoutIndexForOutcome("yes", outcomes)).toBe(1);
    expect(binaryPayoutIndexForOutcome("no", outcomes)).toBe(0);
  });

  it("onchain status after off-chain resolve when condition linked", () => {
    expect(
      onchainStatusAfterOffchainResolve({
        onchain_condition_id: "0x" + "b".repeat(64),
        onchain_resolve_status: "none",
      }),
    ).toBe("pending_uma");
    expect(
      onchainStatusAfterOffchainResolve({
        onchain_condition_id: null,
        onchain_resolve_status: "none",
      }),
    ).toBe("none");
    expect(
      onchainStatusAfterOffchainResolve({
        onchain_condition_id: "0x" + "c".repeat(64),
        onchain_resolve_status: "skipped",
      }),
    ).toBe("skipped");
  });

  it("resolve bridge hints for pending UMA", () => {
    const state = buildResolveBridgeState(
      {
        onchain_condition_id: "0x" + "d".repeat(64),
        onchain_question_id: "0x" + "e".repeat(64),
        onchain_adapter_version: UMA_ADAPTER_VERSION,
        onchain_init_tx_hash: null,
        onchain_init_at: null,
        onchain_resolve_status: "pending_uma",
        onchain_resolve_tx_hash: null,
        onchain_resolve_at: null,
        onchain_resolve_note: null,
      },
      "yes",
      [
        { outcome_key: "yes", label: "Да", sort_order: 0 },
        { outcome_key: "no", label: "Нет", sort_order: 1 },
      ],
    );
    expect(state.step).toBe("await_uma");
    expect(state.payoutIndex).toBe(1);
  });
});
