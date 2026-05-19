import { describe, it, expect, beforeAll } from "vitest";
import { createServiceClient, createUserClient } from "./helpers/clients";

describe("A11 — admin users", () => {
  const tag = `admusers-${Date.now()}`;
  const adminEmail = `admin-users-${tag}@forecast.local`;
  const traderEmail = `trader-users-${tag}@forecast.local`;
  const password = "TestPass123!";

  let adminClient: Awaited<ReturnType<typeof createUserClient>>;
  let traderClient: Awaited<ReturnType<typeof createUserClient>>;
  let traderId: string;
  let marketId: string;
  let admin: ReturnType<typeof createServiceClient>;

  beforeAll(async () => {
    admin = createServiceClient();
    adminClient = await createUserClient(adminEmail, password);
    traderClient = await createUserClient(traderEmail, password);

    const users = (await admin.auth.admin.listUsers()).data.users;
    const adminId = users.find((u) => u.email === adminEmail)!.id;
    traderId = users.find((u) => u.email === traderEmail)!.id;
    await admin.from("profiles").update({ is_admin: true }).eq("id", adminId);

    const slug = `users-block-${tag}`;
    const { data: mid, error } = await adminClient.rpc("admin_create_market", {
      p_slug: slug,
      p_title: `Users block test ${tag}`,
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
  });

  it("lists users for admin", async () => {
    const { data, error } = await adminClient.rpc("admin_users_list", {
      p_search: traderEmail,
      p_limit: 10,
      p_offset: 0,
    });
    expect(error).toBeNull();
    const row = (data ?? []).find((u: { id: string }) => u.id === traderId);
    expect(row).toBeTruthy();
    expect(row.email).toBe(traderEmail);
  });

  it("rejects list for non-admin", async () => {
    const { error } = await traderClient.rpc("admin_users_list", {
      p_search: null,
      p_limit: 5,
      p_offset: 0,
    });
    expect(error).toBeTruthy();
  });

  it("blocks trading when trading_blocked is set", async () => {
    const { error: updateErr } = await adminClient.rpc("admin_update_user", {
      p_user_id: traderId,
      p_trading_blocked: true,
      p_kyc_status: "none",
      p_moderation_note: "test block",
      p_rate_limit_multiplier: 1,
    });
    expect(updateErr).toBeNull();

    const { error: orderErr } = await traderClient.rpc("place_order", {
      p_market_id: marketId,
      p_side: "yes",
      p_direction: "buy",
      p_price: 0.5,
      p_size: 1,
    });
    expect(orderErr).toBeTruthy();
    expect(orderErr!.message).toMatch(/Trading suspended/i);

    await adminClient.rpc("admin_update_user", {
      p_user_id: traderId,
      p_trading_blocked: false,
      p_kyc_status: "none",
      p_moderation_note: null,
      p_rate_limit_multiplier: 1,
    });
  });

  it("writes user.update to audit log", async () => {
    const { error: updateErr } = await adminClient.rpc("admin_update_user", {
      p_user_id: traderId,
      p_trading_blocked: false,
      p_kyc_status: "verified",
      p_moderation_note: null,
      p_rate_limit_multiplier: 0.5,
    });
    expect(updateErr).toBeNull();

    const { data } = await adminClient.rpc("admin_audit_log_list", {
      p_limit: 30,
      p_offset: 0,
    });
    const row = (data ?? []).find(
      (r: { action?: string; entity_id?: string }) =>
        r.action === "user.update" && r.entity_id === traderId,
    );
    expect(row).toBeTruthy();
  });
});
