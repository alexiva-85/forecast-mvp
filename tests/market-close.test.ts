import { describe, it, expect, beforeAll } from "vitest";
import { createServiceClient, createUserClient } from "./helpers/clients";

describe("C4 — market close by closes_at", () => {
  const tag = `close-${Date.now()}`;
  const email = `trader-${tag}@forecast.local`;
  const password = "TestPass123!";
  let marketId: string;
  let trader: Awaited<ReturnType<typeof createUserClient>>;
  let admin: ReturnType<typeof createServiceClient>;

  beforeAll(async () => {
    admin = createServiceClient();
    trader = await createUserClient(email, password);

    const userId = (await admin.auth.admin.listUsers()).data.users.find(
      (u) => u.email === email,
    )!.id;
    await admin.from("profiles").update({ balance: 5000 }).eq("id", userId);

    const past = new Date(Date.now() - 60_000).toISOString();
    const { data: market, error } = await admin
      .from("markets")
      .insert({
        slug: `closed-${tag}`,
        title: "Expired market",
        category: "crypto",
        status: "open",
        closes_at: past,
        resolution_rules: "Test",
        resolution_checklist: ["x"],
      })
      .select("id")
      .single();

    if (error || !market) throw error ?? new Error("market insert failed");
    marketId = market.id;
  });

  it("close_expired_markets sets status to closed", async () => {
    const { data: count, error } = await admin.rpc("close_expired_markets");
    expect(error).toBeNull();
    expect(Number(count)).toBeGreaterThanOrEqual(1);

    const { data: market } = await admin
      .from("markets")
      .select("status")
      .eq("id", marketId)
      .single();

    expect(market?.status).toBe("closed");
  });

  it("place_order rejects trading on closed market", async () => {
    const { error } = await trader.rpc("place_order", {
      p_market_id: marketId,
      p_side: "yes",
      p_direction: "buy",
      p_price: 0.5,
      p_size: 1,
    });

    expect(error?.message).toMatch(/Trading closed|not open/i);
  });
});
