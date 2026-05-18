import { describe, it, expect, beforeAll } from "vitest";
import { createServiceClient, createUserClient } from "./helpers/clients";

describe("A3 — resolve audit fields", () => {
  const tag = `audit-${Date.now()}`;
  const email = `admin-audit-${tag}@forecast.local`;
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

    slug = `audit-mkt-${tag}`;
    const { data: market, error } = await admin
      .from("markets")
      .insert({
        slug,
        title: `Audit ${tag}`,
        category: "crypto",
        status: "closed",
        is_sandbox: true,
        resolution_rules: "Test",
        resolution_checklist: ["a"],
      })
      .select("id")
      .single();

    if (error || !market) throw error ?? new Error("market insert failed");
    marketId = market.id;
  });

  it("stores comment and proof URL on resolve", async () => {
    const { error } = await adminUser.rpc("admin_resolve_market", {
      p_market_id: marketId,
      p_side: "yes",
      p_comment: "Итог по официальному источнику",
      p_proof_url: "https://example.com/proof",
    });
    expect(error).toBeNull();

    const { data } = await admin
      .from("markets")
      .select(
        "resolve_comment, resolve_proof_url, resolved_at, resolved_by, status",
      )
      .eq("id", marketId)
      .single();

    expect(data?.status).toBe("resolved");
    expect(data?.resolve_comment).toBe("Итог по официальному источнику");
    expect(data?.resolve_proof_url).toBe("https://example.com/proof");
    expect(data?.resolved_at).toBeTruthy();
    expect(data?.resolved_by).toBeTruthy();
  });

  it("rejects invalid proof URL", async () => {
    const slug2 = `audit-bad-${tag}`;
    const { data: market } = await admin
      .from("markets")
      .insert({
        slug: slug2,
        title: "Bad proof",
        category: "crypto",
        status: "closed",
        is_sandbox: true,
        resolution_rules: "Test",
        resolution_checklist: ["a"],
      })
      .select("id")
      .single();

    const { error } = await adminUser.rpc("admin_resolve_market", {
      p_market_id: market!.id,
      p_side: "no",
      p_proof_url: "ftp://bad",
    });
    expect(error?.message).toMatch(/http/i);
  });
});
