import { describe, it, expect, beforeAll } from "vitest";
import { createServiceClient, createUserClient } from "./helpers/clients";

describe("B4 — market orders (FOK / IOC)", () => {
  const tag = `mkt-${Date.now()}`;
  const emailMaker = `maker-${tag}@forecast.local`;
  const emailTaker = `taker-${tag}@forecast.local`;
  const password = "TestPass123!";

  let makerId: string;
  let takerId: string;
  let maker: Awaited<ReturnType<typeof createUserClient>>;
  let taker: Awaited<ReturnType<typeof createUserClient>>;
  let admin: ReturnType<typeof createServiceClient>;

  beforeAll(async () => {
    admin = createServiceClient();
    maker = await createUserClient(emailMaker, password);
    taker = await createUserClient(emailTaker, password);

    const users = (await admin.auth.admin.listUsers()).data.users;
    makerId = users.find((u) => u.email === emailMaker)!.id;
    takerId = users.find((u) => u.email === emailTaker)!.id;

    await admin.from("profiles").update({ balance: 10000 }).eq("id", makerId);
    await admin.from("profiles").update({ balance: 10000 }).eq("id", takerId);
  });

  async function createMarket(suffix: string) {
    const slug = `test-mkt-${tag}-${suffix}`;
    const { data: market, error } = await admin
      .from("markets")
      .insert({
        slug,
        title: `Market order ${suffix}`,
        category: "crypto",
        status: "open",
        resolution_rules: "Test",
        resolution_checklist: ["test"],
        is_sandbox: true,
      })
      .select("id")
      .single();

    if (error || !market) throw error ?? new Error("market");
    return market.id as string;
  }

  async function seedSellLimit(marketId: string, price: number, size: number) {
    await admin.from("positions").upsert({
      user_id: makerId,
      market_id: marketId,
      side: "yes",
      shares: size,
    });

    const { error } = await maker.rpc("place_order", {
      p_market_id: marketId,
      p_side: "yes",
      p_direction: "sell",
      p_price: price,
      p_size: size,
    });
    expect(error).toBeNull();
  }

  it("IOC buy fills partial and does not rest on book", async () => {
    const marketId = await createMarket("ioc");
    await seedSellLimit(marketId, 0.45, 3);

    const { data, error } = await taker.rpc("place_market_order", {
      p_market_id: marketId,
      p_side: "yes",
      p_direction: "buy",
      p_size: 10,
      p_time_in_force: "ioc",
    });

    expect(error).toBeNull();
    expect(Number(data.filled)).toBe(3);
    expect(Number(data.requested)).toBe(10);

    const { data: marketOrders } = await admin
      .from("orders")
      .select("status, remaining")
      .eq("market_id", marketId)
      .eq("user_id", takerId)
      .eq("order_kind", "market");

    expect(marketOrders?.length).toBe(1);
    expect(marketOrders![0].status).toBe("filled");
    expect(Number(marketOrders![0].remaining)).toBe(0);

    const { count } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("market_id", marketId)
      .eq("user_id", takerId)
      .eq("status", "open");

    expect(count).toBe(0);
  });

  it("FOK buy rejects when book cannot fill full size", async () => {
    const marketId = await createMarket("fok-fail");
    await seedSellLimit(marketId, 0.5, 2);

    const { error } = await taker.rpc("place_market_order", {
      p_market_id: marketId,
      p_side: "yes",
      p_direction: "buy",
      p_size: 5,
      p_time_in_force: "fok",
    });

    expect(error?.message).toMatch(/Insufficient liquidity/i);

    const { data: position } = await taker
      .from("positions")
      .select("shares")
      .eq("market_id", marketId)
      .eq("side", "yes")
      .maybeSingle();

    expect(Number(position?.shares ?? 0)).toBe(0);
  });

  it("FOK buy fills when liquidity is sufficient", async () => {
    const marketId = await createMarket("fok-ok");
    await seedSellLimit(marketId, 0.52, 8);

    const { data, error } = await taker.rpc("place_market_order", {
      p_market_id: marketId,
      p_side: "yes",
      p_direction: "buy",
      p_size: 5,
      p_time_in_force: "fok",
    });

    expect(error).toBeNull();
    expect(Number(data.filled)).toBe(5);
    expect(Number(data.avg_price)).toBeCloseTo(0.52, 2);
  });
});
