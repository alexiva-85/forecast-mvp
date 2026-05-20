import amoyReference from "../../../contracts/addresses/amoy-reference.json";

export type OnchainAddressProfile = "reference" | "forecast";

export type OnchainAddresses = {
  network: string;
  chainId: number;
  source: string;
  rpcUrl?: string;
  contracts: {
    ctfExchange: string | null;
    negRiskCtfExchange?: string | null;
    conditionalTokens: string | null;
    collateralToken: string | null;
    ctfCollateralAdapter?: string | null;
    umaCtfAdapter?: string | null;
  };
  oracle?: {
    adapter: string;
    adapterVersion: string;
    adapterCommit?: string;
  };
  eip712?: {
    exchangeDomainVersion: string;
    exchangeVerifyingContract: string | null;
    negRiskVerifyingContract?: string | null;
  };
};

/** Polymarket Amoy reference stack (E5 smoke / dev). */
export const AMOY_REFERENCE: OnchainAddresses =
  amoyReference as OnchainAddresses;

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_ONCHAIN_CHAIN_ID ?? 80002);

export function getOnchainChainId(): number {
  return CHAIN_ID;
}

/**
 * Exchange address for EIP-712 / wallet flows.
 * Prefer env override; fallback to Amoy reference.
 */
export function getCtfExchangeAddress(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_CTF_EXCHANGE_ADDRESS;
  if (fromEnv) return fromEnv;
  if (CHAIN_ID === 80002) return AMOY_REFERENCE.contracts.ctfExchange;
  return null;
}

export function getEip712ExchangeDomainVersion(): string {
  return AMOY_REFERENCE.eip712?.exchangeDomainVersion ?? "2";
}

/** UMA CTF Adapter v3.1.0 on Amoy (E6). */
export function getUmaCtfAdapterAddress(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_UMA_CTF_ADAPTER_ADDRESS;
  if (fromEnv) return fromEnv;
  if (CHAIN_ID === 80002) return AMOY_REFERENCE.contracts.umaCtfAdapter ?? null;
  return null;
}
