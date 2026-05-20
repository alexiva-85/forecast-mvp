import { describe, it, expect, beforeAll } from "vitest";
import {
  buildQuoteLadder,
  inferMidFromOrders,
  totalSellSize,
} from "../scripts/mm/quote.mjs";
import { createServiceClient, createUserClient } from "./helpers/clients";

describe("E7 — MM liquidity integration", () => {
  const tag = `mm-${Date.now()}`;
  const mmEmail = `mm-${tag}@forecast.local`;
  const password = "TestPass123!";

  let admin: ReturnType<typeof createServiceClient>;
  let mmUserId: string;
  let mmClient: Awaited<ReturnType<typeof createUserClient>>;
  let marketId: string;
  const slug = `mm-market-${tag}`;

  beforeAll(async () => {
    admin = createServiceClient();
    mmClient = await createUserClient(mmEmail, password);

    const users = (await admin.auth.admin.listUsers()).data.users;
    mmUserId = users.find((u) => u.email === mmEmail)!.id;

    await admin
      .from("profiles")
      .update({ is_mm_bot: true, balance: 100_000 })
      .eq("id", mmUserId);

    const { data: market, error } = await admin
      .from("markets")
      .insert({
        slug,
        title: `MM test ${tag}`,
        category: "crypto",
        status: "open",
        resolution_rules: "Test.",
        resolution_checklist: ["test"],
        is_sandbox: true,
      })
      .select("id")
      .single();

    if (error || !market) throw error ?? new Error("market insert failed");
    marketId = market.id;
  });

  it("mm bot places two-sided book without rate limit", async () => {
    const cfg = { spread: 0.03, levels: 2, step: 0.02, sizePerLevel: 5 };
    const legs = buildQuoteLadder(0.5, cfg);
    const sellNeed = totalSellSize(legs);

    await admin.from("positions").upsert({
      user_id: mmUserId,
      market_id: marketId,
      side: "yes",
      shares: sellNeed + 10,
    });

    for (const leg of legs) {
      const { error } = await mmClient.rpc("place_order", {
        p_market_id: marketId,
        p_side: "yes",
        p_direction: leg.direction,
        p_price: leg.price,
        p_size: leg.size,
      });
      expect(error).toBeNull();
    }

    const { data: open } = await admin
      .from("orders")
      .select("direction, price, user_id, status")
      .eq("market_id", marketId)
      .eq("user_id", mmUserId)
      .eq("status", "open");

    expect(open?.length).toBe(legs.length);

    const mid = inferMidFromOrders(
      (open ?? []).map((o) => ({
        direction: o.direction,
        price: Number(o.price),
      })),
    );
    expect(mid).toBeGreaterThan(0.45);
    expect(mid).toBeLessThan(0.55);
  });

  it("is_mm_bot exempts from place_order rate limit", async () => {
    const { data: rule } = await admin
      .from("rate_limit_rules")
      .select("max_requests")
      .eq("action", "place_order")
      .single();

    const max = Number(rule?.max_requests ?? 30);
    const tiny = 1;
    const attempts = max + 5;

    for (let i = 0; i < attempts; i += 1) {
      const { error } = await mmClient.rpc("place_order", {
        p_market_id: marketId,
        p_side: "yes",
        p_direction: "buy",
        p_price: 0.41,
        p_size: tiny,
      });
      expect(error).toBeNull();
    }
  });
});
