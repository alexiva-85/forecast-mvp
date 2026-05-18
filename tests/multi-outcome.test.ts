import { describe, it, expect, beforeAll } from "vitest";
import { createServiceClient, createUserClient } from "./helpers/clients";

describe("B7 — multi-outcome markets", () => {
  const tag = `multi-${Date.now()}`;
  const password = "TestPass123!";
  let marketId: string;
  let admin: ReturnType<typeof createServiceClient>;
  let traderClient: Awaited<ReturnType<typeof createUserClient>>;

  beforeAll(async () => {
    admin = createServiceClient();
    const adminEmail = `admin-multi-${tag}@forecast.local`;
    const { data: createdAdmin, error: createAdminErr } =
      await admin.auth.admin.createUser({
        email: adminEmail,
        password,
        email_confirm: true,
      });
    if (createAdminErr || !createdAdmin.user) throw createAdminErr;
    await admin
      .from("profiles")
      .update({ is_admin: true })
      .eq("id", createdAdmin.user.id);

    traderClient = await createUserClient(`trader-${tag}@forecast.local`, password);
    const adminClient = await createUserClient(adminEmail, password);
    const adminUserId = (await admin.auth.admin.listUsers()).data.users.find(
      (u) => u.email === adminEmail,
    )!.id;
    await admin.from("profiles").update({ is_admin: true }).eq("id", adminUserId);

    const slug = `test-multi-${tag}`;
    const { data, error } = await adminClient.rpc("admin_create_market", {
      p_slug: slug,
      p_title: `Multi test ${tag}`,
      p_description: null,
      p_category: "crypto",
      p_closes_at: null,
      p_resolution_rules: "Winner takes all",
      p_resolution_checklist: ["done"],
      p_tags: [],
      p_is_sandbox: true,
      p_outcomes: [
        { key: "alpha", label: "Alpha" },
        { key: "beta", label: "Beta" },
        { key: "gamma", label: "Gamma" },
      ],
    });

    if (error || !data) throw error ?? new Error("create market failed");
    marketId = data as string;

    const traderId = (await admin.auth.admin.listUsers()).data.users.find(
      (u) => u.email === `trader-${tag}@forecast.local`,
    )!.id;
    await admin.from("profiles").update({ balance: 10000 }).eq("id", traderId);

    const { error: buyErr } = await traderClient.rpc("place_order", {
      p_market_id: marketId,
      p_side: "beta",
      p_direction: "buy",
      p_price: 0.4,
      p_size: 2,
    });
    if (buyErr) throw buyErr;
  });

  it("stores three outcomes for multi market", async () => {
    const { data, error } = await admin
      .from("market_outcomes")
      .select("outcome_key, label")
      .eq("market_id", marketId)
      .order("sort_order");

    expect(error).toBeNull();
    expect(data?.map((r) => r.outcome_key)).toEqual(["alpha", "beta", "gamma"]);
  });

  it("rejects unknown outcome key", async () => {
    const { error } = await traderClient.rpc("place_order", {
      p_market_id: marketId,
      p_side: "unknown",
      p_direction: "buy",
      p_price: 0.5,
      p_size: 1,
    });
    expect(error?.message).toMatch(/Invalid outcome/i);
  });
});
