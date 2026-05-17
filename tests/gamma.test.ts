import { describe, it, expect } from "vitest";
import {
  gammaSlugToForecast,
  inferGammaCategory,
  isBinaryYesNoMarket,
  isGammaIdeaCandidate,
  mapGammaMarketToDraft,
  parseGammaYesPrice,
  pickGammaIdeas,
} from "../src/lib/gamma";

const sampleMarket = {
  id: "1",
  question: "Will Bitcoin hit $150k by December 31, 2026?",
  slug: "will-bitcoin-hit-150k-by-december-31-2026",
  description: "Resolves Yes if Binance BTC/USDT daily close exceeds $150,000.",
  outcomes: '["Yes", "No"]',
  outcomePrices: '["0.42", "0.58"]',
  endDate: "2026-12-31T23:59:59Z",
  volumeNum: 125000,
  active: true,
  closed: false,
  negRisk: false,
  events: [{ title: "Bitcoin price", tags: [{ slug: "crypto" }] }],
};

describe("C6 — Gamma mapping", () => {
  it("parses yes price from outcomePrices", () => {
    expect(parseGammaYesPrice(sampleMarket.outcomePrices)).toBe(0.42);
  });

  it("detects binary Yes/No markets", () => {
    expect(isBinaryYesNoMarket(sampleMarket)).toBe(true);
    expect(
      isBinaryYesNoMarket({ ...sampleMarket, outcomes: '["A","B","C"]' }),
    ).toBe(false);
  });

  it("infers crypto category from tags", () => {
    expect(inferGammaCategory(sampleMarket)).toBe("crypto");
    expect(
      inferGammaCategory({
        ...sampleMarket,
        events: [{ title: "NFL Super Bowl winner" }],
      }),
    ).toBe("sport");
  });

  it("builds forecast slug with ref- prefix", () => {
    const slug = gammaSlugToForecast(sampleMarket.slug, sampleMarket.question);
    expect(slug.startsWith("ref-")).toBe(true);
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("maps market to admin draft", () => {
    const draft = mapGammaMarketToDraft(sampleMarket);
    expect(draft.title).toBe(sampleMarket.question);
    expect(draft.category).toBe("crypto");
    expect(draft.resolutionRules).toContain("Binance");
    expect(draft.resolutionChecklist.split("\n").length).toBeGreaterThan(2);
    expect(draft.referenceYesPrice).toBe(0.42);
  });

  it("filters idea candidates", () => {
    const ideas = pickGammaIdeas(
      [
        sampleMarket,
        { ...sampleMarket, id: "2", closed: true },
        { ...sampleMarket, id: "3", negRisk: true },
      ],
      5,
    );
    expect(ideas).toHaveLength(1);
    expect(isGammaIdeaCandidate(sampleMarket)).toBe(true);
  });
});
