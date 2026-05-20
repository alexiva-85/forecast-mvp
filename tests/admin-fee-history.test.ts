import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServiceClient, createUserClient } from "./helpers/clients";

const DEFAULT_FEE_RATE = 0.01;

describe("A13 — admin_fee_rate_history_list", () => {
  const tag = `fee-hist-${Date.now()}`;
  const email = `admin-fee-hist-${tag}@forecast.local`;
  const password = "TestPass123!";

  let adminUser: Awaited<ReturnType<typeof createUserClient>>;
  let serviceAdmin: ReturnType<typeof createServiceClient>;

  beforeAll(async () => {
    serviceAdmin = createServiceClient();
    adminUser = await createUserClient(email, password);
    const users = (await serviceAdmin.auth.admin.listUsers()).data.users;
    const adminId = users.find((u) => u.email === email)!.id;
    await serviceAdmin.from("profiles").update({ is_admin: true }).eq("id", adminId);

    const { error } = await adminUser.rpc("admin_set_trade_fee_rate", {
      p_rate: 0.015,
    });
    expect(error).toBeNull();
  });

  afterAll(async () => {
    await serviceAdmin
      .from("platform_settings")
      .update({ trade_fee_rate: DEFAULT_FEE_RATE })
      .eq("id", 1);
  });

  it("returns fee rate changes from audit log", async () => {
    const { data, error } = await adminUser.rpc("admin_fee_rate_history_list", {
      p_limit: 10,
    });
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);

    const latest = data![0] as {
      old_rate: number | string;
      new_rate: number | string;
    };
    expect(Number(latest.new_rate)).toBe(0.015);
  });

  it("rejects non-admin", async () => {
    const user = await createUserClient(
      `not-admin-fee-${tag}@forecast.local`,
      password,
    );
    const { error } = await user.rpc("admin_fee_rate_history_list", {
      p_limit: 5,
    });
    expect(error).toBeTruthy();
  });
});
