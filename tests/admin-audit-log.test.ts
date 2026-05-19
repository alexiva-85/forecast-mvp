import { describe, it, expect, beforeAll } from "vitest";
import { createServiceClient, createUserClient } from "./helpers/clients";

describe("A4 — admin audit log", () => {
  const tag = `auditlog-${Date.now()}`;
  const email = `admin-log-${tag}@forecast.local`;
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

    slug = `audit-log-${tag}`;
    const { data: market, error } = await adminUser.rpc("admin_create_market", {
      p_slug: slug,
      p_title: `Audit log market ${tag}`,
      p_description: null,
      p_category: "crypto",
      p_closes_at: null,
      p_resolution_rules: "Official Binance BTCUSDT close on resolution date.",
      p_resolution_checklist: ["Source checked"],
      p_tags: [],
      p_is_sandbox: true,
    });
    expect(error).toBeNull();
    marketId = market as string;
  });

  it("records market.create in admin_audit_log_list", async () => {
    const { data, error } = await adminUser.rpc("admin_audit_log_list", {
      p_limit: 20,
      p_offset: 0,
    });
    expect(error).toBeNull();
    const row = (data ?? []).find(
      (r: { entity_slug?: string; action?: string }) =>
        r.entity_slug === slug && r.action === "market.create",
    );
    expect(row).toBeTruthy();
    expect(row.summary).toMatch(/Audit log market/);
  });

  it("records market.close after admin_close_market", async () => {
    const { error: closeErr } = await adminUser.rpc("admin_close_market", {
      p_market_slug: slug,
    });
    expect(closeErr).toBeNull();

    const { data } = await adminUser.rpc("admin_audit_log_list", {
      p_limit: 30,
      p_offset: 0,
    });
    const row = (data ?? []).find(
      (r: { action?: string; entity_id?: string }) =>
        r.action === "market.close" && r.entity_id === marketId,
    );
    expect(row).toBeTruthy();
  });

  it("rejects audit log list for non-admin", async () => {
    const anon = await createUserClient(
      `not-admin-${tag}@forecast.local`,
      password,
    );
    const { error } = await anon.rpc("admin_audit_log_list", {
      p_limit: 5,
      p_offset: 0,
    });
    expect(error).toBeTruthy();
  });
});
