export type MarketCategory = "sport" | "crypto";
export type MarketStatus = "open" | "closed" | "resolved";
export type OutcomeSide = "yes" | "no";
export type OrderDirection = "buy" | "sell";

export interface Market {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: MarketCategory;
  status: MarketStatus;
  resolved_side: OutcomeSide | null;
  closes_at: string | null;
  resolution_rules: string | null;
  resolution_checklist: string[];
  tags: string[];
  is_sandbox: boolean;
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
  side: OutcomeSide;
  direction: OrderDirection;
  price: number;
  size: number;
  remaining: number;
  status: string;
  created_at: string;
}

export interface Trade {
  id: string;
  market_id: string;
  side: OutcomeSide;
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
  side: OutcomeSide;
  shares: number;
}

export interface MarketWithPrice extends Market {
  yes_price: number;
}
