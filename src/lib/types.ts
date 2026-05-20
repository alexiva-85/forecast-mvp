export type MarketCategory = "sport" | "crypto";
export type MarketStatus = "draft" | "open" | "closed" | "resolved";
export type OutcomeSide = "yes" | "no";
export type OutcomeKey = string;
export type OutcomeMode = "binary" | "multi";

export interface MarketOutcome {
  outcome_key: string;
  label: string;
  sort_order: number;
}
export type OrderDirection = "buy" | "sell";
export type OrderKind = "limit" | "market";
export type TimeInForce = "gtc" | "fok" | "ioc";

export interface Market {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: MarketCategory;
  status: MarketStatus;
  resolved_side: OutcomeSide | null;
  resolved_outcome_key?: string | null;
  outcome_mode?: OutcomeMode;
  closes_at: string | null;
  resolution_rules: string | null;
  resolution_checklist: string[];
  tags: string[];
  is_sandbox: boolean;
  resolve_comment?: string | null;
  resolve_proof_url?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  onchain_condition_id?: string | null;
  onchain_question_id?: string | null;
  onchain_adapter_version?: string | null;
  onchain_init_tx_hash?: string | null;
  onchain_init_at?: string | null;
  onchain_resolve_status?:
    | "none"
    | "pending_uma"
    | "ready_onchain"
    | "resolved_onchain"
    | "skipped";
  onchain_resolve_tx_hash?: string | null;
  onchain_resolve_at?: string | null;
  onchain_resolve_note?: string | null;
  created_at: string;
}

export function parseTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is string => typeof t === "string");
}

export function parseChecklist(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string");
}

export interface Profile {
  id: string;
  display_name: string | null;
  balance: number;
  is_admin: boolean;
}

export interface Order {
  id: string;
  user_id: string;
  market_id: string;
  side: OutcomeKey;
  direction: OrderDirection;
  price: number;
  size: number;
  remaining: number;
  status: string;
  order_kind?: OrderKind;
  time_in_force?: TimeInForce;
  created_at: string;
}

export interface Trade {
  id: string;
  market_id: string;
  side: OutcomeKey;
  price: number;
  size: number;
  fee_amount?: number;
  buyer_id: string;
  seller_id: string;
  created_at: string;
}

export interface Position {
  user_id: string;
  market_id: string;
  side: OutcomeKey;
  shares: number;
}

export interface MarketWithPrice extends Market {
  yes_price: number;
  outcomes: MarketOutcome[];
  outcome_prices: Record<string, number>;
}
