import { describe, it, expect, beforeAll } from "vitest";
import { createServiceClient, createUserClient } from "./helpers/clients";
import { volumePeriodLabel } from "@/lib/admin";

describe("A9 — admin volume dashboard", () => {
  const tag = `vol-${Date.now()}`;
  const email = `vol-admin-${tag}@forecast.local`;
  const password = "TestPass123!";

  let user: Awaited<ReturnType<typeof createUserClient>>;
  let admin: ReturnType<typeof createServiceClient>;

  beforeAll(async () => {
    admin = createServiceClient();
    user = await createUserClient(email, password);
    const users = (await admin.auth.admin.listUsers()).data.users;
    const adminId = users.find((u) => u.email === email)!.id;
    await admin.from("profiles").update({ is_admin: true }).eq("id", adminId);
  });

  it("admin_platform_volume returns period metrics for admin", async () => {
    const { data, error } = await user.rpc("admin_platform_volume");
    expect(error).toBeNull();
    const row = data?.[0];
    if (row) {
      expect(Number(row.volume_24h)).toBeGreaterThanOrEqual(0);
      expect(Number(row.volume_7d)).toBeGreaterThanOrEqual(0);
      expect(Number(row.volume_30d)).toBeGreaterThanOrEqual(0);
    }
  });

  it("admin_top_markets_by_volume returns array for admin", async () => {
    const { data, error } = await user.rpc("admin_top_markets_by_volume", {
      p_days: 30,
      p_limit: 5,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe("admin volume labels", () => {
  it("volumePeriodLabel is Russian", () => {
    expect(volumePeriodLabel("24h")).toBe("24 часа");
    expect(volumePeriodLabel("7d")).toBe("7 дней");
    expect(volumePeriodLabel("30d")).toBe("30 дней");
  });
});
