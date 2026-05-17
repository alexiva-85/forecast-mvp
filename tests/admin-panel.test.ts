import { describe, it, expect, beforeAll } from "vitest";
import { createServiceClient, createUserClient } from "./helpers/clients";

describe("C7 — admin panel", () => {
  const tag = `admin-${Date.now()}`;
  const email = `admin-${tag}@forecast.local`;
  const password = "TestPass123!";

  let marketId: string;
  let adminId: string;
  let user: Awaited<ReturnType<typeof createUserClient>>;
  let admin: ReturnType<typeof createServiceClient>;

  beforeAll(async () => {
    admin = createServiceClient();
    user = await createUserClient(email, password);
    const users = (await admin.auth.admin.listUsers()).data.users;
    adminId = users.find((u) => u.email === email)!.id;
    await admin.from("profiles").update({ is_admin: true }).eq("id", adminId);

    const slug = `test-market-${tag}`;
    const { data: market, error } = await admin
      .from("markets")
      .insert({
        slug,
        title: `Test market ${tag}`,
        category: "crypto",
        status: "open",
        is_sandbox: true,
        resolution_rules: "Test rules.",
        resolution_checklist: ["check"],
      })
      .select("id")
      .single();

    if (error || !market) throw error ?? new Error("market insert failed");
    marketId = market.id;
  });

  it("admin_resolve_market rejects open markets", async () => {
    const { error } = await user.rpc("admin_resolve_market", {
      p_market_id: marketId,
      p_side: "yes",
    });
    expect(error?.message).toMatch(/closed before resolve/i);
  });

  it("admin_resolve_market succeeds when market is closed", async () => {
    await admin.from("markets").update({ status: "closed" }).eq("id", marketId);

    const { error } = await user.rpc("admin_resolve_market", {
      p_market_id: marketId,
      p_side: "no",
    });
    expect(error).toBeNull();

    const { data } = await admin
      .from("markets")
      .select("status, resolved_side")
      .eq("id", marketId)
      .single();

    expect(data?.status).toBe("resolved");
    expect(data?.resolved_side).toBe("no");
  });

  it("admin_market_stats returns metrics for admin", async () => {
    const { data, error } = await user.rpc("admin_market_stats", {
      p_market_ids: [marketId],
    });
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data![0].market_id).toBe(marketId);
  });
});
