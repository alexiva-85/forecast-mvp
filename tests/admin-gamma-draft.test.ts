import { describe, it, expect, beforeAll } from "vitest";
import { createServiceClient, createUserClient } from "./helpers/clients";
import {
  gammaDraftToCreateMarketInput,
  mapGammaMarketToDraft,
} from "../src/lib/gamma";

const sampleMarket = {
  id: "gamma-a14-test",
  question: "Will Ethereum flip Bitcoin market cap in 2026?",
  slug: "will-ethereum-flip-bitcoin-market-cap-in-2026",
  description: "Resolves Yes if ETH market cap exceeds BTC on CoinGecko.",
  outcomes: '["Yes", "No"]',
  outcomePrices: '["0.12", "0.88"]',
  endDate: "2026-12-31T23:59:59Z",
  volumeNum: 50000,
  active: true,
  closed: false,
  negRisk: false,
  events: [{ title: "Crypto", tags: [{ slug: "crypto" }] }],
};

describe("A14 — Gamma one-click draft", () => {
  const tag = `gamma-a14-${Date.now()}`;
  const email = `gamma-a14-${tag}@forecast.local`;
  const password = "TestPass123!";

  let admin: ReturnType<typeof createServiceClient>;
  let user: Awaited<ReturnType<typeof createUserClient>>;
  let slug: string;
  let marketId: string;

  beforeAll(async () => {
    admin = createServiceClient();
    user = await createUserClient(email, password);
    const users = (await admin.auth.admin.listUsers()).data.users;
    const adminId = users.find((u) => u.email === email)!.id;
    await admin.from("profiles").update({ is_admin: true }).eq("id", adminId);

    const draft = mapGammaMarketToDraft({
      ...sampleMarket,
      slug: `will-ethereum-flip-btc-${tag}`,
    });
    slug = draft.slug;
    const input = gammaDraftToCreateMarketInput(draft);

    const { data, error } = await user.rpc("admin_create_market", input);
    expect(error).toBeNull();
    marketId = data as string;
  });

  it("creates draft market from Gamma template", async () => {
    const { data, error } = await admin
      .from("markets")
      .select("status, is_sandbox, title, resolution_rules")
      .eq("id", marketId)
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe("draft");
    expect(data?.is_sandbox).toBe(false);
    expect(data?.title).toBe(sampleMarket.question);
    expect(data?.resolution_rules).toContain("CoinGecko");
  });

  it("slug matches gamma ref- prefix", () => {
    expect(slug.startsWith("ref-")).toBe(true);
  });
});
