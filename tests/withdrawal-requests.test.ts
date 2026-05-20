import { describe, it, expect, beforeAll } from "vitest";
import {
  createAnonClient,
  createServiceClient,
  createUserClient,
} from "./helpers/clients";

describe("E3 — withdrawal requests", () => {
  const tag = `wd-${Date.now()}`;
  const email = `withdraw-${tag}@forecast.local`;
  const password = "TestPass123!";

  let user: Awaited<ReturnType<typeof createUserClient>>;
  let userId: string;
  let admin: ReturnType<typeof createServiceClient>;

  beforeAll(async () => {
    admin = createServiceClient();
    user = await createUserClient(email, password);

    const users = (await admin.auth.admin.listUsers()).data.users;
    userId = users.find((u) => u.email === email)!.id;
    await admin.from("profiles").update({ balance: 5000 }).eq("id", userId);
  });

  it("list_my_withdrawal_requests requires auth", async () => {
    const anon = createAnonClient();
    const { error } = await anon.rpc("list_my_withdrawal_requests", {
      p_limit: 10,
    });
    expect(error?.message).toMatch(/Not authenticated/i);
  });

  it("submits pending withdrawal and lists it", async () => {
    const { data: requestId, error } = await user.rpc(
      "submit_withdrawal_request",
      {
        p_amount: 100,
        p_method: "bank",
        p_details: "Demo account",
      },
    );
    expect(error).toBeNull();
    expect(requestId).toBeTruthy();

    const { data: list, error: listErr } = await user.rpc(
      "list_my_withdrawal_requests",
      { p_limit: 10 },
    );
    expect(listErr).toBeNull();
    const row = (list ?? []).find(
      (r: { id?: string }) => r.id === requestId,
    );
    expect(row).toBeTruthy();
    expect(row.status).toBe("pending");
    expect(Number(row.amount)).toBe(100);
  });

  it("rejects duplicate pending withdrawal", async () => {
    const { error } = await user.rpc("submit_withdrawal_request", {
      p_amount: 50,
      p_method: "crypto",
      p_details: null,
    });
    expect(error).toBeTruthy();
    expect(error!.message).toMatch(/already pending/i);
  });

  it("rejects amount above balance", async () => {
    await admin
      .from("withdrawal_requests")
      .update({ status: "cancelled" })
      .eq("user_id", userId)
      .eq("status", "pending");

    const { error } = await user.rpc("submit_withdrawal_request", {
      p_amount: 99999,
      p_method: "bank",
      p_details: null,
    });
    expect(error).toBeTruthy();
    expect(error!.message).toMatch(/Insufficient balance/i);
  });
});
