import { describe, it, expect, beforeAll } from "vitest";
import { createServiceClient, createUserClient } from "./helpers/clients";

describe("A18 — admin_close_market", () => {
  const tag = `close-${Date.now()}`;
  const email = `admin-close-${tag}@forecast.local`;
  const password = "TestPass123!";

  let marketId: string;
  let slug: string;
  let adminUser: Awaited<ReturnType<typeof createUserClient>>;
  let admin: ReturnType<typeof createServiceClient>;

  beforeAll(async () => {
    admin = createServiceClient();
    adminUser = await createUserClient(email, password);
    const users = (await admin.auth.admin.listUsers()).data.users;
    const adminId = users.find((u) => u.email === email)!.id;
    await admin.from("profiles").update({ is_admin: true }).eq("id", adminId);

    slug = `close-mkt-${tag}`;
    const { data: market, error } = await admin
      .from("markets")
      .insert({
        slug,
        title: `Close test ${tag}`,
        category: "crypto",
        status: "open",
        is_sandbox: true,
        resolution_rules: "Test",
        resolution_checklist: ["a"],
      })
      .select("id")
      .single();

    if (error || !market) throw error ?? new Error("market insert failed");
    marketId = market.id;
  });

  it("rejects non-admin", async () => {
    const anon = (await import("./helpers/clients")).createAnonClient();
    const { error } = await anon.rpc("admin_close_market", {
      p_market_slug: slug,
    });
    expect(error?.message).toMatch(/Admin only|JWT/i);
  });

  it("closes open market and cancels open orders", async () => {
    const users = (await admin.auth.admin.listUsers()).data.users;
    const traderId = users.find((u) => u.email === email)!.id;
    await admin.from("profiles").update({ balance: 10000 }).eq("id", traderId);

    await admin.from("positions").upsert({
      user_id: traderId,
      market_id: marketId,
      side: "yes",
      shares: 10,
    });

    await adminUser.rpc("place_order", {
      p_market_id: marketId,
      p_side: "yes",
      p_direction: "sell",
      p_price: 0.5,
      p_size: 3,
    });

    const { error } = await adminUser.rpc("admin_close_market", {
      p_market_slug: slug,
    });
    expect(error).toBeNull();

    const { data: market } = await admin
      .from("markets")
      .select("status")
      .eq("id", marketId)
      .single();
    expect(market?.status).toBe("closed");

    const { data: orders } = await admin
      .from("orders")
      .select("status")
      .eq("market_id", marketId);
    expect(orders?.every((o) => o.status === "cancelled")).toBe(true);
  });

  it("rejects closing already closed market", async () => {
    const { error } = await adminUser.rpc("admin_close_market", {
      p_market_slug: slug,
    });
    expect(error?.message).toMatch(/not open/i);
  });

  it("allows resolve after manual close", async () => {
    const { error } = await adminUser.rpc("admin_resolve_market", {
      p_market_id: marketId,
      p_side: "yes",
    });
    expect(error).toBeNull();
  });
});
