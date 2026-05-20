import { describe, it, expect, beforeAll } from "vitest";
import { createServiceClient, createUserClient } from "./helpers/clients";

describe("A1 — market draft status", () => {
  const tag = `draft-${Date.now()}`;
  const email = `draft-admin-${tag}@forecast.local`;
  const password = "TestPass123!";
  const slug = `draft-market-${tag}`;

  let admin: ReturnType<typeof createServiceClient>;
  let user: Awaited<ReturnType<typeof createUserClient>>;
  let marketId: string;

  beforeAll(async () => {
    admin = createServiceClient();
    user = await createUserClient(email, password);
    const users = (await admin.auth.admin.listUsers()).data.users;
    const adminId = users.find((u) => u.email === email)!.id;
    await admin.from("profiles").update({ is_admin: true }).eq("id", adminId);

    const { data, error } = await user.rpc("admin_create_market", {
      p_slug: slug,
      p_title: `Draft market ${tag}`,
      p_description: "Test",
      p_category: "crypto",
      p_closes_at: null,
      p_resolution_rules: "Rules for draft test.",
      p_resolution_checklist: ["check"],
      p_tags: ["test"],
      p_is_sandbox: false,
    });

    expect(error).toBeNull();
    marketId = data as string;
  });

  it("creates production market as draft", async () => {
    const { data, error } = await admin
      .from("markets")
      .select("status, is_sandbox")
      .eq("id", marketId)
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe("draft");
    expect(data?.is_sandbox).toBe(false);
  });

  it("admin_publish_draft_market opens market", async () => {
    const { error } = await user.rpc("admin_publish_draft_market", {
      p_market_slug: slug,
    });
    expect(error).toBeNull();

    const { data } = await admin
      .from("markets")
      .select("status")
      .eq("id", marketId)
      .single();

    expect(data?.status).toBe("open");
  });

  it("rejects publish when market is not draft", async () => {
    const { error } = await user.rpc("admin_publish_draft_market", {
      p_market_slug: slug,
    });
    expect(error?.message).toMatch(/not draft/i);
  });

  it("sandbox publish still uses is_sandbox flag", async () => {
    const sandboxSlug = `sandbox-${tag}`;
    const { data: id, error: createErr } = await user.rpc("admin_create_market", {
      p_slug: sandboxSlug,
      p_title: `Sandbox ${tag}`,
      p_description: null,
      p_category: "crypto",
      p_closes_at: null,
      p_resolution_rules: "Sandbox rules.",
      p_resolution_checklist: ["check"],
      p_is_sandbox: true,
    });
    expect(createErr).toBeNull();

    const { data: before } = await admin
      .from("markets")
      .select("status, is_sandbox")
      .eq("id", id as string)
      .single();
    expect(before?.status).toBe("open");
    expect(before?.is_sandbox).toBe(true);

    const { error: pubErr } = await user.rpc("admin_publish_market", {
      p_market_slug: sandboxSlug,
    });
    expect(pubErr).toBeNull();

    const { data: after } = await admin
      .from("markets")
      .select("status, is_sandbox")
      .eq("id", id as string)
      .single();
    expect(after?.status).toBe("open");
    expect(after?.is_sandbox).toBe(false);
  });
});
