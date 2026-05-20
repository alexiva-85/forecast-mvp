import { describe, it, expect } from "vitest";
import {
  buildQuoteLadder,
  inferMidFromOrders,
  roundPrice,
  totalSellSize,
} from "../scripts/mm/quote.mjs";

describe("E7 — MM quote ladder", () => {
  it("builds symmetric bids and asks around mid", () => {
    const legs = buildQuoteLadder(0.5, {
      spread: 0.02,
      levels: 2,
      step: 0.02,
      sizePerLevel: 10,
    });
    const buys = legs.filter((l) => l.direction === "buy");
    const sells = legs.filter((l) => l.direction === "sell");
    expect(buys.length).toBe(2);
    expect(sells.length).toBe(2);
    expect(buys[0].price).toBe(0.48);
    expect(sells[0].price).toBe(0.52);
    expect(totalSellSize(legs)).toBe(20);
  });

  it("infers mid from best bid and ask", () => {
    const mid = inferMidFromOrders([
      { direction: "buy", price: 0.44 },
      { direction: "sell", price: 0.56 },
    ]);
    expect(mid).toBe(roundPrice(0.5));
  });

  it("clamps prices inside (0, 1)", () => {
    const legs = buildQuoteLadder(0.02, {
      spread: 0.02,
      levels: 3,
      step: 0.02,
      sizePerLevel: 5,
    });
    for (const leg of legs) {
      expect(leg.price).toBeGreaterThan(0);
      expect(leg.price).toBeLessThan(1);
    }
  });
});
