import { describe, it, expect, beforeAll } from "vitest";
import {
  createAnonClient,
  createServiceClient,
  createUserClient,
} from "./helpers/clients";

describe("D6 — content reports", () => {
  const tag = `report-${Date.now()}`;
  const reporterEmail = `reporter-${tag}@forecast.local`;
  const adminEmail = `admin-report-${tag}@forecast.local`;
  const password = "TestPass123!";

  let admin: ReturnType<typeof createServiceClient>;
  let reporter: Awaited<ReturnType<typeof createUserClient>>;
  let adminUser: Awaited<ReturnType<typeof createUserClient>>;
  let marketSlug: string;

  beforeAll(async () => {
    admin = createServiceClient();
    reporter = await createUserClient(reporterEmail, password);
    adminUser = await createUserClient(adminEmail, password);

    const users = (await admin.auth.admin.listUsers()).data.users;
    const adminId = users.find((u) => u.email === adminEmail)!.id;
    await admin.from("profiles").update({ is_admin: true }).eq("id", adminId);

    marketSlug = `report-market-${tag}`;
    const { error } = await adminUser.rpc("admin_create_market", {
      p_slug: marketSlug,
      p_title: `Report test ${tag}`,
      p_description: null,
      p_category: "crypto",
      p_closes_at: null,
      p_resolution_rules: "Rules.",
      p_resolution_checklist: ["step"],
      p_tags: [],
      p_is_sandbox: true,
    });
    expect(error).toBeNull();
  });

  it("submits and lists pending market report", async () => {
    const { data: reportId, error } = await reporter.rpc(
      "submit_content_report",
      {
        p_subject_type: "market",
        p_subject_slug: marketSlug,
        p_reason: "misleading",
        p_details: "Test complaint",
      },
    );
    expect(error).toBeNull();
    expect(reportId).toBeTruthy();

    const { error: dupErr } = await reporter.rpc("submit_content_report", {
      p_subject_type: "market",
      p_subject_slug: marketSlug,
      p_reason: "spam",
      p_details: null,
    });
    expect(dupErr).toBeTruthy();
    expect(dupErr!.message).toMatch(/already pending/i);

    const { data: list } = await adminUser.rpc("admin_reports_list", {
      p_status: "pending",
      p_limit: 20,
      p_offset: 0,
    });
    const row = (list ?? []).find(
      (r: { id?: string }) => r.id === reportId,
    );
    expect(row).toBeTruthy();
    expect(row.subject_slug).toBe(marketSlug);
  });

  it("admin processes report and writes audit", async () => {
    const { data: list } = await adminUser.rpc("admin_reports_list", {
      p_status: "pending",
      p_limit: 5,
      p_offset: 0,
    });
    const pending = (list ?? []).find(
      (r: { subject_slug?: string }) => r.subject_slug === marketSlug,
    );
    expect(pending).toBeTruthy();

    const { error } = await adminUser.rpc("admin_update_content_report", {
      p_report_id: pending.id,
      p_status: "reviewed",
      p_admin_note: "Checked",
    });
    expect(error).toBeNull();

    const { data: audit } = await adminUser.rpc("admin_audit_log_list", {
      p_limit: 30,
      p_offset: 0,
    });
    const logRow = (audit ?? []).find(
      (r: { action?: string; entity_id?: string }) =>
        r.action === "report.update" && r.entity_id === pending.id,
    );
    expect(logRow).toBeTruthy();
  });

  it("rejects non-authenticated submit", async () => {
    const anon = createAnonClient();
    const { error } = await anon.rpc("submit_content_report", {
      p_subject_type: "market",
      p_subject_slug: marketSlug,
      p_reason: "other",
      p_details: null,
    });
    expect(error).toBeTruthy();
    expect(error!.message).toMatch(/Not authenticated/i);
  });
});
