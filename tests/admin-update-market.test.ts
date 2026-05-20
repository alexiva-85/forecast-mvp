import { describe, it, expect, beforeAll } from "vitest";
import { createServiceClient, createUserClient } from "./helpers/clients";

describe("A2 — admin_update_market", () => {
  const tag = `edit-${Date.now()}`;
  const email = `admin-edit-${tag}@forecast.local`;
  const password = "TestPass123!";

  let admin: ReturnType<typeof createServiceClient>;
  let adminUser: Awaited<ReturnType<typeof createUserClient>>;
  let draftSlug: string;
  let openSlug: string;
  let draftId: string;
  let openId: string;

  beforeAll(async () => {
    admin = createServiceClient();
    adminUser = await createUserClient(email, password);
    const users = (await admin.auth.admin.listUsers()).data.users;
    const adminId = users.find((u) => u.email === email)!.id;
    await admin.from("profiles").update({ is_admin: true }).eq("id", adminId);

    draftSlug = `edit-draft-${tag}`;
    const { data: draftIdRaw, error: draftErr } = await adminUser.rpc(
      "admin_create_market",
      {
        p_slug: draftSlug,
        p_title: `Draft edit ${tag}`,
        p_description: "Before",
        p_category: "crypto",
        p_closes_at: null,
        p_resolution_rules: "Rules v1.",
        p_resolution_checklist: ["step 1"],
        p_tags: ["alpha"],
        p_is_sandbox: false,
      },
    );
    expect(draftErr).toBeNull();
    draftId = draftIdRaw as string;

    openSlug = `edit-open-${tag}`;
    const { data: openIdRaw, error: openErr } = await adminUser.rpc(
      "admin_create_market",
      {
        p_slug: openSlug,
        p_title: `Open edit ${tag}`,
        p_description: "Before",
        p_category: "sport",
        p_closes_at: null,
        p_resolution_rules: "Rules v1.",
        p_resolution_checklist: ["step 1"],
        p_tags: [],
        p_is_sandbox: true,
      },
    );
    expect(openErr).toBeNull();
    openId = openIdRaw as string;

    const { error: pubErr } = await adminUser.rpc("admin_publish_market", {
      p_market_slug: openSlug,
    });
    expect(pubErr).toBeNull();
  });

  it("updates draft market fields and slug", async () => {
    const newSlug = `${draftSlug}-renamed`;
    const { data, error } = await adminUser.rpc("admin_update_market", {
      p_market_slug: draftSlug,
      p_title: `Draft edit ${tag} v2`,
      p_description: "After",
      p_category: "sport",
      p_closes_at: null,
      p_resolution_rules: "Rules v2.",
      p_resolution_checklist: ["step 1", "step 2"],
      p_tags: ["beta"],
      p_new_slug: newSlug,
    });
    expect(error).toBeNull();
    expect(data).toBe(newSlug);

    const { data: row } = await admin
      .from("markets")
      .select("slug, title, status")
      .eq("id", draftId)
      .single();
    expect(row?.slug).toBe(newSlug);
    expect(row?.title).toContain("v2");
    draftSlug = newSlug;
  });

  it("updates published open market without slug change", async () => {
    const { data, error } = await adminUser.rpc("admin_update_market", {
      p_market_slug: openSlug,
      p_title: `Open edit ${tag} fixed typo`,
      p_description: "After publish",
      p_category: "sport",
      p_closes_at: null,
      p_resolution_rules: "Rules v2.",
      p_resolution_checklist: ["step 1", "step 2"],
      p_tags: ["sport"],
    });
    expect(error).toBeNull();
    expect(data).toBe(openSlug);

    const { error: slugErr } = await adminUser.rpc("admin_update_market", {
      p_market_slug: openSlug,
      p_title: `Open edit ${tag} fixed typo`,
      p_description: "After publish",
      p_category: "sport",
      p_closes_at: null,
      p_resolution_rules: "Rules v2.",
      p_resolution_checklist: ["step 1", "step 2"],
      p_tags: ["sport"],
      p_new_slug: "other-slug",
    });
    expect(slugErr).toBeTruthy();
    expect(slugErr!.message).toMatch(/Slug cannot be changed/);
  });

  it("records market.update in admin_audit_log_list", async () => {
    const { data } = await adminUser.rpc("admin_audit_log_list", {
      p_limit: 50,
      p_offset: 0,
    });
    const row = (data ?? []).find(
      (r: { action?: string; entity_id?: string }) =>
        r.action === "market.update" && r.entity_id === openId,
    );
    expect(row).toBeTruthy();
    expect(row.metadata?.changes?.title).toBeTruthy();
  });

  it("rejects edit on resolved market", async () => {
    await adminUser.rpc("admin_close_market", { p_market_slug: openSlug });
    await adminUser.rpc("admin_resolve_market", {
      p_market_id: openId,
      p_side: "yes",
    });

    const { error } = await adminUser.rpc("admin_update_market", {
      p_market_slug: openSlug,
      p_title: "Too late",
      p_description: null,
      p_category: "sport",
      p_closes_at: null,
      p_resolution_rules: "Rules.",
      p_resolution_checklist: ["x"],
      p_tags: [],
    });
    expect(error).toBeTruthy();
    expect(error!.message).toMatch(/Cannot edit resolved/);
  });

  it("rejects non-admin", async () => {
    const anon = await createUserClient(
      `not-admin-edit-${tag}@forecast.local`,
      password,
    );
    const { error } = await anon.rpc("admin_update_market", {
      p_market_slug: draftSlug,
      p_title: "Hack",
      p_description: null,
      p_category: "crypto",
      p_closes_at: null,
      p_resolution_rules: "Rules.",
      p_resolution_checklist: ["x"],
      p_tags: [],
    });
    expect(error).toBeTruthy();
  });
});
