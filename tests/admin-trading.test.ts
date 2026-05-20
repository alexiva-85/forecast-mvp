import { describe, it, expect, beforeAll } from "vitest";
import { createServiceClient, createUserClient } from "./helpers/clients";

describe("A12 — admin trades and orders", () => {
  const tag = `admtrade-${Date.now()}`;
  const adminEmail = `admin-trade-${tag}@forecast.local`;
  const buyerEmail = `buyer-trade-${tag}@forecast.local`;
  const sellerEmail = `seller-trade-${tag}@forecast.local`;
  const password = "TestPass123!";

  let adminClient: Awaited<ReturnType<typeof createUserClient>>;
  let buyerClient: Awaited<ReturnType<typeof createUserClient>>;
  let sellerClient: Awaited<ReturnType<typeof createUserClient>>;
  let buyerId: string;
  let sellerId: string;
  let marketId: string;
  let marketSlug: string;
  let admin: ReturnType<typeof createServiceClient>;

  beforeAll(async () => {
    admin = createServiceClient();
    adminClient = await createUserClient(adminEmail, password);
    buyerClient = await createUserClient(buyerEmail, password);
    sellerClient = await createUserClient(sellerEmail, password);

    const users = (await admin.auth.admin.listUsers()).data.users;
    const adminId = users.find((u) => u.email === adminEmail)!.id;
    buyerId = users.find((u) => u.email === buyerEmail)!.id;
    sellerId = users.find((u) => u.email === sellerEmail)!.id;
    await admin.from("profiles").update({ is_admin: true }).eq("id", adminId);
    await admin.from("profiles").update({ balance: 10000 }).eq("id", buyerId);
    await admin.from("profiles").update({ balance: 10000 }).eq("id", sellerId);

    marketSlug = `trade-list-${tag}`;
    const { data: mid, error } = await adminClient.rpc("admin_create_market", {
      p_slug: marketSlug,
      p_title: `Trade list test ${tag}`,
      p_description: null,
      p_category: "crypto",
      p_closes_at: null,
      p_resolution_rules: "Official Binance BTCUSDT close on resolution date.",
      p_resolution_checklist: ["Source checked"],
      p_tags: [],
      p_is_sandbox: true,
    });
    expect(error).toBeNull();
    marketId = mid as string;

    await admin.from("positions").upsert({
      user_id: sellerId,
      market_id: marketId,
      side: "yes",
      shares: 10,
    });

    const { error: sellErr } = await sellerClient.rpc("place_order", {
      p_market_id: marketId,
      p_side: "yes",
      p_direction: "sell",
      p_price: 0.55,
      p_size: 10,
    });
    expect(sellErr).toBeNull();

    const { error: buyErr } = await buyerClient.rpc("place_order", {
      p_market_id: marketId,
      p_side: "yes",
      p_direction: "buy",
      p_price: 0.55,
      p_size: 4,
    });
    expect(buyErr).toBeNull();
  });

  it("lists trades for admin", async () => {
    const { data, error } = await adminClient.rpc("admin_trades_list", {
      p_search: marketSlug,
      p_limit: 20,
      p_offset: 0,
    });
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
    const row = (data ?? [])[0] as { market_slug: string; buyer_email: string };
    expect(row.market_slug).toBe(marketSlug);
    expect(row.buyer_email).toBe(buyerEmail);
  });

  it("lists orders for admin with status filter", async () => {
    const { data, error } = await adminClient.rpc("admin_orders_list", {
      p_search: buyerEmail,
      p_status: null,
      p_limit: 20,
      p_offset: 0,
    });
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);

    const { data: openOnly } = await adminClient.rpc("admin_orders_list", {
      p_search: marketSlug,
      p_status: "open",
      p_limit: 20,
      p_offset: 0,
    });
    expect(openOnly?.every((o: { status: string }) => o.status === "open")).toBe(
      true,
    );
  });

  it("rejects lists for non-admin", async () => {
    const { error: tradesErr } = await buyerClient.rpc("admin_trades_list", {
      p_search: null,
      p_limit: 5,
      p_offset: 0,
    });
    expect(tradesErr).toBeTruthy();

    const { error: ordersErr } = await buyerClient.rpc("admin_orders_list", {
      p_search: null,
      p_status: null,
      p_limit: 5,
      p_offset: 0,
    });
    expect(ordersErr).toBeTruthy();
  });
});
