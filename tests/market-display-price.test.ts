import { describe, it, expect } from "vitest";
import { displayOutcomePrice } from "@/lib/outcomes";
import type { MarketWithPrice } from "@/lib/types";

function market(
  outcome_prices: Record<string, number>,
  yes_price = outcome_prices.yes ?? 0.5,
): Pick<MarketWithPrice, "outcome_prices" | "yes_price"> {
  return { outcome_prices, yes_price };
}

describe("displayOutcomePrice", () => {
  it("uses outcome_prices.no instead of complement when no trades differ from yes", () => {
    const m = market({ yes: 0.99, no: 0.5 }, 0.99);
    expect(displayOutcomePrice(m, "yes")).toBe(0.99);
    expect(displayOutcomePrice(m, "no")).toBe(0.5);
  });

  it("falls back to 1-yes for no when outcome_prices.no is missing", () => {
    const m = market({ yes: 0.6 }, 0.6);
    expect(displayOutcomePrice(m, "no")).toBe(0.4);
  });

  it("falls back to yes_price for yes when outcome_prices.yes is missing", () => {
    const m = market({}, 0.72);
    expect(displayOutcomePrice(m, "yes")).toBe(0.72);
  });
});
