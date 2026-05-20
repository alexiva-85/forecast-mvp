/**
 * E7 — quote ladder for off-chain MM (binary / single-outcome book).
 */

/** @typedef {{ direction: 'buy' | 'sell', price: number, size: number }} QuoteLeg */

/**
 * @param {number} mid
 * @param {{ spread: number, levels: number, step: number, sizePerLevel: number }} cfg
 * @returns {QuoteLeg[]}
 */
export function buildQuoteLadder(mid, cfg) {
  const { spread, levels, step, sizePerLevel } = cfg;
  const legs = [];
  for (let i = 0; i < levels; i += 1) {
    const offset = spread + i * step;
    const bid = roundPrice(mid - offset);
    const ask = roundPrice(mid + offset);
    if (bid > 0 && bid < 1) {
      legs.push({ direction: "buy", price: bid, size: sizePerLevel });
    }
    if (ask > 0 && ask < 1) {
      legs.push({ direction: "sell", price: ask, size: sizePerLevel });
    }
  }
  return legs;
}

/**
 * Mid from open orders (mirrors src/lib/outcomes.ts getOutcomePrice).
 * @param {{ direction: string, price: number | string }[]} openOrders
 * @param {number} [fallback=0.5]
 */
export function inferMidFromOrders(openOrders, fallback = 0.5) {
  if (!openOrders?.length) return fallback;

  const bids = openOrders
    .filter((o) => o.direction === "buy")
    .map((o) => Number(o.price));
  const asks = openOrders
    .filter((o) => o.direction === "sell")
    .map((o) => Number(o.price));

  const bestBid = bids.length ? Math.max(...bids) : 0;
  const bestAsk = asks.length ? Math.min(...asks) : 1;

  if (bestBid > 0 && bestAsk < 1) {
    return roundPrice((bestBid + bestAsk) / 2);
  }
  if (bestBid > 0) return roundPrice(bestBid);
  if (bestAsk < 1) return roundPrice(bestAsk);
  return fallback;
}

/** @param {number} p */
export function roundPrice(p) {
  return Math.round(p * 100) / 100;
}

/**
 * Shares needed to rest all sell legs on one outcome.
 * @param {QuoteLeg[]} legs
 */
export function totalSellSize(legs) {
  return legs
    .filter((l) => l.direction === "sell")
    .reduce((sum, l) => sum + l.size, 0);
}
