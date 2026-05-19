import { describe, it, expect } from "vitest";
import {
  buildMarketQualityWarnings,
  checkMarketDraftQuality,
} from "../src/lib/admin-quality";
import type { AdminMarket } from "../src/lib/admin";

function market(overrides: Partial<AdminMarket>): AdminMarket {
  return {
    id: "m1",
    slug: "test",
    title: "Test",
    description: null,
    category: "crypto",
    status: "open",
    resolved_side: null,
    closes_at: null,
    resolution_rules: "x".repeat(50),
    resolution_checklist: ["a"],
    tags: [],
    is_sandbox: false,
    created_at: new Date().toISOString(),
    yes_price: 0.5,
    outcome_mode: "binary",
    outcomes: [],
    outcome_prices: { yes: 0.5, no: 0.5 },
    stats: { trade_count: 0, volume_usd: 0, open_orders: 0 },
    ...overrides,
  };
}

describe("A7 — quality warnings", () => {
  it("flags short and vague titles", () => {
    const w = checkMarketDraftQuality({
      title: "BTC может вырасти",
      resolutionRules: "Официальная цена на Binance BTCUSDT на 31.12.2026 23:59 UTC.",
    });
    expect(w.some((x) => x.code === "title_short")).toBe(true);
    expect(w.some((x) => x.code === "title_vague")).toBe(true);
  });

  it("flags closes_at in the past for open markets", () => {
    const w = checkMarketDraftQuality({
      title: "Bitcoin выше $200k до конца 2027",
      closesAt: "2020-01-01T12:00:00",
      resolutionRules: "Официальная цена на Binance BTCUSDT на 31.12.2026 23:59 UTC.",
      status: "open",
    });
    expect(w.some((x) => x.code === "closes_at_past")).toBe(true);
  });

  it("skips sandbox markets in overview builder", () => {
    const items = buildMarketQualityWarnings([
      market({
        title: "Коротко",
        is_sandbox: true,
        resolution_rules: "x".repeat(50),
      }),
    ]);
    expect(items).toHaveLength(0);
  });

  it("collects warnings for production open markets", () => {
    const items = buildMarketQualityWarnings([
      market({
        title: "Bitcoin выше $200k до конца 2027",
        closes_at: "2020-01-01T12:00:00.000Z",
        resolution_rules: "Официальная цена на Binance BTCUSDT на 31.12.2026 23:59 UTC.",
      }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].warnings.some((x) => x.code === "closes_at_past")).toBe(true);
  });
});
