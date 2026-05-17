import { describe, it, expect, beforeAll } from "vitest";
import { createAnonClient, createServiceClient, createUserClient } from "./helpers/clients";

describe("G3 — RLS audit", () => {
  const tag = `rls-${Date.now()}`;
  const email = `test-${tag}@forecast.local`;
  const password = "TestPass123!";
  let userId: string;
  let userClient: Awaited<ReturnType<typeof createUserClient>>;

  beforeAll(async () => {
    userClient = await createUserClient(email, password);
    const admin = createServiceClient();
    const { data } = await admin.auth.admin.listUsers();
    const user = data.users.find((u) => u.email === email);
    if (!user) throw new Error("Test user not created");
    userId = user.id;
    await admin.from("profiles").update({ balance: 5000 }).eq("id", userId);
  });

  it("blocks direct balance update on profiles", async () => {
    const { error } = await userClient
      .from("profiles")
      .update({ balance: 999999 })
      .eq("id", userId);

    expect(error).toBeTruthy();
  });

  it("blocks direct insert into orders", async () => {
    const admin = createServiceClient();
    const { data: market } = await admin
      .from("markets")
      .select("id")
      .eq("status", "open")
      .limit(1)
      .single();

    const { error } = await userClient.from("orders").insert({
      user_id: userId,
      market_id: market!.id,
      side: "yes",
      direction: "buy",
      price: 0.5,
      size: 1,
      remaining: 1,
      status: "open",
    });

    expect(error).toBeTruthy();
  });

  it("blocks anon reading profiles", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon.from("profiles").select("id").limit(1);
    expect(error?.code === "42501" || (data?.length ?? 0) === 0).toBe(true);
  });

  it("allows update_display_name RPC", async () => {
    const { error } = await userClient.rpc("update_display_name", {
      p_display_name: "Тест RLS",
    });
    expect(error).toBeNull();

    const { data } = await userClient
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    expect(data?.display_name).toBe("Тест RLS");
  });
});
