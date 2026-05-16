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
  created_at: string;
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
