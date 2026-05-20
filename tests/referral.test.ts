import { describe, it, expect, beforeAll } from "vitest";
import {
  createAnonClient,
  createServiceClient,
  createUserClient,
} from "./helpers/clients";

describe("F2 — referral program", () => {
  const tag = `ref-${Date.now()}`;
  const referrerEmail = `referrer-${tag}@forecast.local`;
  const refereeEmail = `referee-${tag}@forecast.local`;
  const password = "TestPass123!";

  let referrer: Awaited<ReturnType<typeof createUserClient>>;
  let referee: Awaited<ReturnType<typeof createUserClient>>;
  let referrerId: string;
  let refereeId: string;
  let referrerCode: string;
  let admin: ReturnType<typeof createServiceClient>;

  beforeAll(async () => {
    admin = createServiceClient();
    referrer = await createUserClient(referrerEmail, password);
    referee = await createUserClient(refereeEmail, password);

    const users = (await admin.auth.admin.listUsers()).data.users;
    referrerId = users.find((u) => u.email === referrerEmail)!.id;
    refereeId = users.find((u) => u.email === refereeEmail)!.id;

    const { data: profile } = await admin
      .from("profiles")
      .select("referral_code, balance")
      .eq("id", referrerId)
      .single();

    referrerCode = profile!.referral_code as string;
    expect(referrerCode).toBeTruthy();
  });

  it("get_my_referral_summary requires auth", async () => {
    const anon = createAnonClient();
    const { error } = await anon.rpc("get_my_referral_summary");
    expect(error?.message).toMatch(/Not authenticated/i);
  });

  it("rejects own referral code", async () => {
    const { error } = await referrer.rpc("apply_referral_code", {
      p_code: referrerCode,
    });
    expect(error).toBeTruthy();
    expect(error!.message).toMatch(/own referral/i);
  });

  it("applies code and pays both bonuses", async () => {
    const { data: beforeReferee } = await admin
      .from("profiles")
      .select("balance")
      .eq("id", refereeId)
      .single();
    const { data: beforeReferrer } = await admin
      .from("profiles")
      .select("balance")
      .eq("id", referrerId)
      .single();

    const { error } = await referee.rpc("apply_referral_code", {
      p_code: referrerCode,
    });
    expect(error).toBeNull();

    const { data: afterReferee } = await admin
      .from("profiles")
      .select("balance")
      .eq("id", refereeId)
      .single();
    const { data: afterReferrer } = await admin
      .from("profiles")
      .select("balance")
      .eq("id", referrerId)
      .single();

    expect(Number(afterReferee?.balance)).toBe(
      Number(beforeReferee?.balance) + 500,
    );
    expect(Number(afterReferrer?.balance)).toBe(
      Number(beforeReferrer?.balance) + 500,
    );

    const { data: summary } = await referrer.rpc("get_my_referral_summary");
    const row = Array.isArray(summary) ? summary[0] : summary;
    expect(Number(row?.invited_count)).toBeGreaterThanOrEqual(1);
    expect(Number(row?.bonus_earned_usd)).toBeGreaterThanOrEqual(500);

    const { data: refereeSummary } = await referee.rpc(
      "get_my_referral_summary",
    );
    const refereeRow = Array.isArray(refereeSummary)
      ? refereeSummary[0]
      : refereeSummary;
    expect(refereeRow?.can_apply_code).toBe(false);
    expect(refereeRow?.referred_by_label).toBeTruthy();
  });

  it("rejects duplicate application", async () => {
    const { error } = await referee.rpc("apply_referral_code", {
      p_code: referrerCode,
    });
    expect(error).toBeTruthy();
    expect(error!.message).toMatch(/already applied/i);
  });
});
