import { describe, it, expect, beforeAll } from "vitest";
import { createServiceClient, createUserClient } from "./helpers/clients";

describe("G1 — trading RPC", () => {
  const tag = `trade-${Date.now()}`;
  const emailA = `buyer-${tag}@forecast.local`;
  const emailB = `seller-${tag}@forecast.local`;
  const password = "TestPass123!";

  let marketId: string;
  let buyerId: string;
  let sellerId: string;
  let buyer: Awaited<ReturnType<typeof createUserClient>>;
  let seller: Awaited<ReturnType<typeof createUserClient>>;
  let admin: ReturnType<typeof createServiceClient>;

  beforeAll(async () => {
    admin = createServiceClient();
    buyer = await createUserClient(emailA, password);
    seller = await createUserClient(emailB, password);

    const users = (await admin.auth.admin.listUsers()).data.users;
    buyerId = users.find((u) => u.email === emailA)!.id;
    sellerId = users.find((u) => u.email === emailB)!.id;

    await admin.from("profiles").update({ balance: 10000 }).eq("id", buyerId);
    await admin.from("profiles").update({ balance: 10000 }).eq("id", sellerId);

    const slug = `test-market-${tag}`;
    const { data: market, error: marketErr } = await admin
      .from("markets")
      .insert({
        slug,
        title: `Test market ${tag}`,
        category: "crypto",
        status: "open",
        resolution_rules: "Test resolve yes if test passes.",
        resolution_checklist: ["test"],
        is_sandbox: true,
      })
      .select("id")
      .single();

    if (marketErr || !market) throw marketErr ?? new Error("Failed to create test market");
    marketId = market.id;
  });

  it("place_order rejects unauthenticated calls", async () => {
    const anon = (await import("./helpers/clients")).createAnonClient();
    const { error } = await anon.rpc("place_order", {
      p_market_id: marketId,
      p_side: "yes",
      p_direction: "buy",
      p_price: 0.5,
      p_size: 1,
    });
    expect(error?.message).toMatch(/Not authenticated/i);
  });

  it("matches buy and sell with trading fee", async () => {
    const price = 0.4;
    const size = 5;

    await admin.from("positions").upsert({
      user_id: sellerId,
      market_id: marketId,
      side: "yes",
      shares: size,
    });

    const { error: sellErr } = await seller.rpc("place_order", {
      p_market_id: marketId,
      p_side: "yes",
      p_direction: "sell",
      p_price: price,
      p_size: size,
    });
    expect(sellErr).toBeNull();

    const balanceBeforeBuy = await getBalance(buyer, buyerId);

    const { error: buyErr } = await buyer.rpc("place_order", {
      p_market_id: marketId,
      p_side: "yes",
      p_direction: "buy",
      p_price: price,
      p_size: size,
    });
    expect(buyErr).toBeNull();

    const { data: trades } = await admin
      .from("trades")
      .select("size, price, fee_amount, buyer_id, seller_id")
      .eq("market_id", marketId)
      .eq("buyer_id", buyerId)
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false })
      .limit(1);

    expect(trades?.length).toBe(1);
    const trade = trades![0];
    expect(Number(trade.size)).toBe(size);
    expect(Number(trade.fee_amount)).toBeGreaterThan(0);

    const notional = price * size;
    const expectedFee = Math.round(notional * 0.01 * 10000) / 10000;
    expect(Number(trade.fee_amount)).toBe(expectedFee);

    const balanceAfterBuy = await getBalance(buyer, buyerId);
    const spent = balanceBeforeBuy - balanceAfterBuy;
    const buyerFeeHalf = expectedFee / 2;
    expect(spent).toBeGreaterThanOrEqual(notional - 0.01);
    expect(spent).toBeLessThanOrEqual(notional + buyerFeeHalf + 0.01);

    const { data: position } = await buyer
      .from("positions")
      .select("shares")
      .eq("market_id", marketId)
      .eq("side", "yes")
      .single();

    expect(Number(position?.shares)).toBe(size);
  });

  it("redeem_positions pays $1 per winning share after resolve", async () => {
    await admin.from("profiles").update({ is_admin: true }).eq("id", buyerId);

    await admin.from("markets").update({ status: "closed" }).eq("id", marketId);

    const { error: resolveErr } = await buyer.rpc("admin_resolve_market", {
      p_market_id: marketId,
      p_side: "yes",
    });
    expect(resolveErr).toBeNull();

    await admin.from("profiles").update({ is_admin: false }).eq("id", buyerId);

    const balanceBefore = await getBalance(buyer, buyerId);

    const { data: payout, error: redeemErr } = await buyer.rpc("redeem_positions", {
      p_market_id: marketId,
    });

    expect(redeemErr).toBeNull();
    expect(Number(payout)).toBe(5);

    const balanceAfter = await getBalance(buyer, buyerId);
    expect(balanceAfter - balanceBefore).toBeCloseTo(5, 2);
  });
});

async function getBalance(
  client: Awaited<ReturnType<typeof createUserClient>>,
  userId: string,
) {
  const { data } = await client
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .single();
  return Number(data?.balance ?? 0);
}
