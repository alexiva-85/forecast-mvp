import { describe, it, expect, beforeAll } from "vitest";
import { createServiceClient, createUserClient } from "./helpers/clients";

describe("G2 — rate limits", () => {
  const tag = `rate-${Date.now()}`;
  const email = `rate-${tag}@forecast.local`;
  const password = "TestPass123!";
  let marketId: string;
  let user: Awaited<ReturnType<typeof createUserClient>>;
  let admin: ReturnType<typeof createServiceClient>;

  beforeAll(async () => {
    admin = createServiceClient();
    user = await createUserClient(email, password);

    const userId = (await admin.auth.admin.listUsers()).data.users.find(
      (u) => u.email === email,
    )!.id;
    await admin.from("profiles").update({ balance: 1_000_000 }).eq("id", userId);

    const { data: market } = await admin
      .from("markets")
      .select("id")
      .eq("status", "open")
      .limit(1)
      .single();

    if (!market) throw new Error("No open market for rate limit test");
    marketId = market.id;
  });

  it("rejects oversized orders", async () => {
    const { error } = await user.rpc("place_order", {
      p_market_id: marketId,
      p_side: "yes",
      p_direction: "buy",
      p_price: 0.5,
      p_size: 10001,
    });

    expect(error?.message).toMatch(/Order size too large/i);
  });

  it("blocks place_order after limit exceeded", async () => {
    const { data: rule } = await admin
      .from("rate_limit_rules")
      .select("max_requests")
      .eq("action", "place_order")
      .single();

    const defaultLimit = rule?.max_requests ?? 30;
    await admin
      .from("rate_limit_rules")
      .update({ max_requests: 5 })
      .eq("action", "place_order");

    let sawRateLimit = false;
    try {
      for (let i = 0; i < 10; i++) {
        const { error } = await user.rpc("place_order", {
          p_market_id: marketId,
          p_side: "yes",
          p_direction: "buy",
          p_price: 0.01,
          p_size: 1,
        });
        if (error?.message?.match(/Rate limit exceeded/i)) {
          sawRateLimit = true;
          break;
        }
      }
    } finally {
      await admin
        .from("rate_limit_rules")
        .update({ max_requests: defaultLimit })
        .eq("action", "place_order");
    }

    expect(sawRateLimit).toBe(true);
  });
});
