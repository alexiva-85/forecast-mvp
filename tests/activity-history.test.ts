import { describe, it, expect, beforeAll } from "vitest";
import { createServiceClient, createUserClient } from "./helpers/clients";

describe("D5 — activity history", () => {
  const tag = `act-${Date.now()}`;
  const emailA = `buyer-act-${tag}@forecast.local`;
  const emailB = `seller-act-${tag}@forecast.local`;
  const password = "TestPass123!";

  let marketId: string;
  let buyerId: string;
  let buyer: Awaited<ReturnType<typeof createUserClient>>;
  let seller: Awaited<ReturnType<typeof createUserClient>>;
  let admin: ReturnType<typeof createServiceClient>;

  beforeAll(async () => {
    admin = createServiceClient();
    buyer = await createUserClient(emailA, password);
    seller = await createUserClient(emailB, password);

    const users = (await admin.auth.admin.listUsers()).data.users;
    buyerId = users.find((u) => u.email === emailA)!.id;
    const sellerId = users.find((u) => u.email === emailB)!.id;

    await admin.from("profiles").update({ balance: 10000 }).eq("id", buyerId);
    await admin.from("profiles").update({ balance: 10000 }).eq("id", sellerId);

    const { data: market } = await admin
      .from("markets")
      .insert({
        slug: `act-mkt-${tag}`,
        title: `Activity ${tag}`,
        category: "crypto",
        status: "open",
        resolution_rules: "Test",
        resolution_checklist: ["t"],
        is_sandbox: true,
      })
      .select("id")
      .single();

    marketId = market!.id;

    await admin.from("positions").upsert({
      user_id: sellerId,
      market_id: marketId,
      side: "yes",
      shares: 5,
    });

    await seller.rpc("place_order", {
      p_market_id: marketId,
      p_side: "yes",
      p_direction: "sell",
      p_price: 0.5,
      p_size: 3,
    });

    await buyer.rpc("place_order", {
      p_market_id: marketId,
      p_side: "yes",
      p_direction: "buy",
      p_price: 0.5,
      p_size: 3,
    });
  });

  it("list_my_activity requires auth", async () => {
    const anon = (await import("./helpers/clients")).createAnonClient();
    const { error } = await anon.rpc("list_my_activity", { p_limit: 10 });
    expect(error?.message).toMatch(/Not authenticated/i);
  });

  it("includes trades for buyer", async () => {
    const { data, error } = await buyer.rpc("list_my_activity", { p_limit: 20 });
    expect(error).toBeNull();
    const types = (data as { event_type: string }[]).map((r) => r.event_type);
    expect(types).toContain("trade_buy");
  });
});
