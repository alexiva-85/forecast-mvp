/**
 * Off-chain ↔ on-chain bridge stub (E5).
 * Off-chain matcher remains source of truth; this module defines V2 order shape
 * for a future operator that calls Exchange.matchOrders.
 *
 * Do not use @polymarket/clob-client v1. See docs/onchain/v2-checklist.md.
 */

import { getCtfExchangeAddress, getEip712ExchangeDomainVersion } from "./addresses";

export const ORDER_SIDE = { BUY: 0, SELL: 1 } as const;

/** EIP-712 Order fields for CTF Exchange V2 (domain version "2"). */
export type CtfV2OrderStub = {
  salt: string;
  maker: string;
  signer: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  side: (typeof ORDER_SIDE)[keyof typeof ORDER_SIDE];
  signatureType: number;
  /** Milliseconds — replaces V1 nonce for uniqueness. */
  timestamp: string;
  metadata: string;
  builder: string;
};

export type OffchainTradeForBridge = {
  tradeId: string;
  marketId: string;
  outcomeIndex: number;
  price: number;
  quantity: number;
  buyerUserId: string;
  sellerUserId: string;
};

export type BridgeSettlementIntent = {
  status: "stub";
  exchange: string | null;
  eip712DomainVersion: string;
  note: string;
  /** Placeholder: map DB trade → V2 orders + operator match. */
  trade: OffchainTradeForBridge;
};

/**
 * Returns a non-executing settlement intent for logging / future worker.
 * No chain calls in MVP.
 */
export function buildBridgeIntent(
  trade: OffchainTradeForBridge,
): BridgeSettlementIntent {
  return {
    status: "stub",
    exchange: getCtfExchangeAddress(),
    eip712DomainVersion: getEip712ExchangeDomainVersion(),
    note:
      "On-chain matchOrders not wired. Implement operator service after E5 deploy.",
    trade,
  };
}

/** Empty V2 order template for signing experiments (wallet / cast). */
export function emptyV2OrderTemplate(
  maker: string,
): Omit<CtfV2OrderStub, "salt"> & { salt?: string } {
  const zero32 =
    "0x0000000000000000000000000000000000000000000000000000000000000000";
  return {
    maker,
    signer: maker,
    tokenId: "0",
    makerAmount: "0",
    takerAmount: "0",
    side: ORDER_SIDE.BUY,
    signatureType: 0,
    timestamp: String(Date.now()),
    metadata: zero32,
    builder: zero32,
  };
}
