import { describe, it, expect, beforeAll } from "vitest";
import {
  createServiceClient,
  createUserClient,
} from "./helpers/clients";
import { estimateTradeFee } from "../src/lib/platform";

describe("F1 — trading fee ledger", () => {
  const tag = `fee-ledger-${Date.now()}`;
  const buyerEmail = `fee-buyer-${tag}@forecast.local`;
  const sellerEmail = `fee-seller-${tag}@forecast.local`;
  const password = "TestPass123!";

  let admin: ReturnType<typeof createServiceClient>;
  let buyer: Awaited<ReturnType<typeof createUserClient>>;
  let seller: Awaited<ReturnType<typeof createUserClient>>;
  let buyerId: string;
  let sellerId: string;
  let marketId: string;

  beforeAll(async () => {
    admin = createServiceClient();
    buyer = await createUserClient(buyerEmail, password);
    seller = await createUserClient(sellerEmail, password);

    const users = (await admin.auth.admin.listUsers()).data.users;
    buyerId = users.find((u) => u.email === buyerEmail)!.id;
    sellerId = users.find((u) => u.email === sellerEmail)!.id;

    await admin.from("profiles").update({ balance: 10_000 }).eq("id", buyerId);
    await admin.from("profiles").update({ balance: 10_000 }).eq("id", sellerId);

    const { data: markets } = await admin
      .from("markets")
      .select("id")
      .eq("status", "open")
      .limit(1);

    marketId = markets![0].id;
  });

  it("records trade_fee ledger rows after a match", async () => {
    const price = 0.45;
    const size = 4;

    const { data: feeRateRaw } = await admin.rpc("get_trade_fee_rate");
    const feeRate = Number(feeRateRaw);
    const expectedFee = estimateTradeFee(price * size, feeRate);
    const expectedHalf = expectedFee / 2;

    await admin.from("positions").upsert({
      user_id: sellerId,
      market_id: marketId,
      side: "yes",
      shares: size,
    });

    await seller.rpc("place_order", {
      p_market_id: marketId,
      p_side: "yes",
      p_direction: "sell",
      p_price: price,
      p_size: size,
    });

    await buyer.rpc("place_order", {
      p_market_id: marketId,
      p_side: "yes",
      p_direction: "buy",
      p_price: price,
      p_size: size,
    });

    const { data: trade } = await admin
      .from("trades")
      .select("id, fee_amount")
      .eq("market_id", marketId)
      .eq("buyer_id", buyerId)
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    expect(Number(trade?.fee_amount)).toBe(expectedFee);

    const { data: ledgerRows } = await admin
      .from("balance_ledger")
      .select("user_id, amount, kind, trade_id")
      .eq("trade_id", trade!.id)
      .eq("kind", "trade_fee");

    expect(ledgerRows?.length).toBe(2);

    const buyerRow = ledgerRows!.find((r) => r.user_id === buyerId);
    const sellerRow = ledgerRows!.find((r) => r.user_id === sellerId);

    expect(Number(buyerRow?.amount)).toBe(-expectedHalf);
    expect(Number(sellerRow?.amount)).toBe(-expectedHalf);
  });

  it("admin_platform_fee_summary reconciles fee totals", async () => {
    const adminUser = await createUserClient(`fee-admin-${tag}@forecast.local`, password);
    const users = (await admin.auth.admin.listUsers()).data.users;
    const adminId = users.find((u) => u.email === `fee-admin-${tag}@forecast.local`)!
      .id;
    await admin.from("profiles").update({ is_admin: true }).eq("id", adminId);

    const { data, error } = await adminUser.rpc("admin_platform_fee_summary");
    expect(error).toBeNull();

    const row = Array.isArray(data) ? data[0] : data;
    expect(row).toBeTruthy();
    expect(Number(row.trades_fee_total)).toBeGreaterThan(0);
    expect(Number(row.ledger_fee_total)).toBeGreaterThan(0);
    expect(Boolean(row.ledger_reconcile_ok)).toBe(true);
  });
});
