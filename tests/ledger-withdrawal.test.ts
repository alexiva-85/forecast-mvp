import { describe, it, expect, beforeAll } from "vitest";
import {
  createAnonClient,
  createServiceClient,
  createUserClient,
} from "./helpers/clients";

describe("E4 — balance ledger & withdrawal holds", () => {
  const tag = `lg-${Date.now()}`;
  const email = `ledger-${tag}@forecast.local`;
  const password = "TestPass123!";

  let user: Awaited<ReturnType<typeof createUserClient>>;
  let adminUser: Awaited<ReturnType<typeof createUserClient>>;
  let userId: string;
  let admin: ReturnType<typeof createServiceClient>;

  beforeAll(async () => {
    admin = createServiceClient();
    user = await createUserClient(email, password);
    adminUser = await createUserClient(`admin-${tag}@forecast.local`, password);
    const adminUsers = (await admin.auth.admin.listUsers()).data.users;
    const adminId = adminUsers.find((u) => u.email === `admin-${tag}@forecast.local`)!
      .id;
    await admin.from("profiles").update({ is_admin: true }).eq("id", adminId);

    const users = (await admin.auth.admin.listUsers()).data.users;
    userId = users.find((u) => u.email === email)!.id;
    await admin.from("profiles").update({ balance: 5000 }).eq("id", userId);

    await admin.from("balance_ledger").delete().eq("user_id", userId);
    await admin.from("balance_ledger").insert({
      user_id: userId,
      amount: 5000,
      balance_after: 5000,
      kind: "opening_snapshot",
      note: "test reset",
    });
  });

  it("get_my_wallet_summary requires auth", async () => {
    const anon = createAnonClient();
    const { error } = await anon.rpc("get_my_wallet_summary");
    expect(error?.message).toMatch(/Not authenticated/i);
  });

  it("submit holds funds and reduces balance", async () => {
    const { data: requestId, error } = await user.rpc(
      "submit_withdrawal_request",
      {
        p_amount: 200,
        p_method: "bank",
        p_details: "Ledger test",
      },
    );
    expect(error).toBeNull();
    expect(requestId).toBeTruthy();

    const { data: profile } = await admin
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .single();
    expect(Number(profile?.balance)).toBe(4800);

    const { data: summary } = await user.rpc("get_my_wallet_summary");
    const row = Array.isArray(summary) ? summary[0] : summary;
    expect(Number(row.balance)).toBe(4800);
    expect(Number(row.held)).toBe(200);
  });

  it("cancel releases hold back to balance", async () => {
    const { data: list } = await user.rpc("list_my_withdrawal_requests", {
      p_limit: 5,
    });
    const pending = (list ?? []).find(
      (r: { status?: string }) => r.status === "pending",
    );
    expect(pending?.id).toBeTruthy();

    const { error } = await user.rpc("cancel_my_withdrawal_request", {
      p_request_id: pending.id,
    });
    expect(error).toBeNull();

    const { data: profile } = await admin
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .single();
    expect(Number(profile?.balance)).toBe(5000);
  });

  it("admin reject restores balance", async () => {
    const { data: requestId } = await user.rpc("submit_withdrawal_request", {
      p_amount: 150,
      p_method: "crypto",
      p_details: null,
    });

    const { error } = await adminUser.rpc("admin_review_withdrawal", {
      p_request_id: requestId,
      p_status: "rejected",
      p_admin_note: "Test reject",
    });
    expect(error).toBeNull();

    const { data: profile } = await admin
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .single();
    expect(Number(profile?.balance)).toBe(5000);
  });

  it("admin_wallet_reconcile is admin-only", async () => {
    const anon = createAnonClient();
    const { error } = await anon.rpc("admin_wallet_reconcile", {
      p_user_id: null,
    });
    expect(error?.message).toMatch(/Admin only|Not authenticated/i);
  });
});
