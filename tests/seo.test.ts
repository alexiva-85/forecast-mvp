import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isMarketIndexable,
  marketMetaDescription,
  marketOgSubtitle,
  truncateDescription,
} from "@/lib/seo";
import { getSiteOrigin } from "@/lib/site";
import type { MarketWithPrice } from "@/lib/types";

function baseMarket(
  overrides: Partial<MarketWithPrice> = {},
): MarketWithPrice {
  return {
    id: "m1",
    slug: "test-market",
    title: "Bitcoin выше $150k до конца 2026?",
    description: null,
    category: "crypto",
    status: "open",
    is_sandbox: false,
    outcome_mode: "binary",
    closes_at: null,
    resolved_at: null,
    winning_side: null,
    tags: [],
    resolution_rules: null,
    resolution_checklist: null,
    admin_resolve_note: null,
    admin_resolve_proof_url: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    yes_price: 0.42,
    outcome_prices: { yes: 0.42, no: 0.58 },
    outcomes: [
      {
        id: "o1",
        market_id: "m1",
        outcome_key: "yes",
        label: "Да",
        sort_order: 0,
      },
      {
        id: "o2",
        market_id: "m1",
        outcome_key: "no",
        label: "Нет",
        sort_order: 1,
      },
    ],
    ...overrides,
  };
}

describe("getSiteOrigin", () => {
  const prev: Record<string, string | undefined> = {};

  beforeEach(() => {
    prev.NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
    prev.VERCEL_URL = process.env.VERCEL_URL;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = prev.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = prev.VERCEL_URL;
  });

  it("prefers NEXT_PUBLIC_SITE_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://forecast.example/";
    process.env.VERCEL_URL = "preview.vercel.app";
    expect(getSiteOrigin()).toBe("https://forecast.example");
  });

  it("falls back to VERCEL_URL", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = "forecast-mvp-pied.vercel.app";
    expect(getSiteOrigin()).toBe("https://forecast-mvp-pied.vercel.app");
  });
});

describe("market SEO helpers", () => {
  it("truncates long descriptions", () => {
    const text = "а".repeat(200);
    expect(truncateDescription(text).endsWith("…")).toBe(true);
    expect(truncateDescription(text).length).toBeLessThanOrEqual(160);
  });

  it("builds fallback description from title and category", () => {
    const desc = marketMetaDescription(baseMarket());
    expect(desc).toContain("Bitcoin");
    expect(desc).toContain("Крипто");
  });

  it("uses market description when present", () => {
    const desc = marketMetaDescription(
      baseMarket({ description: "Краткое описание события." }),
    );
    expect(desc).toBe("Краткое описание события.");
  });

  it("formats OG subtitle for binary market", () => {
    expect(marketOgSubtitle(baseMarket())).toBe("Да 42¢ · Крипто");
  });

  it("marks draft and sandbox as non-indexable", () => {
    expect(isMarketIndexable(baseMarket())).toBe(true);
    expect(isMarketIndexable(baseMarket({ status: "draft" }))).toBe(false);
    expect(isMarketIndexable(baseMarket({ is_sandbox: true }))).toBe(false);
  });
});
