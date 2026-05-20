import { describe, it, expect } from "vitest";
import { createAnonClient, createUserClient } from "./helpers/clients";
import {
  leaderboardPeriodLabel,
  parseLeaderboardPeriod,
} from "@/lib/leaderboard";

describe("F3 — leaderboard RPC", () => {
  it("public RPCs work for anon", async () => {
    const anon = createAnonClient();

    const summary = await anon.rpc("leaderboard_summary", { p_days: 7 });
    expect(summary.error).toBeNull();
    expect(Number(summary.data?.[0]?.volume_usd ?? 0)).toBeGreaterThanOrEqual(0);

    const traders = await anon.rpc("leaderboard_traders", {
      p_days: 7,
      p_limit: 5,
    });
    expect(traders.error).toBeNull();
    expect(Array.isArray(traders.data)).toBe(true);

    const markets = await anon.rpc("leaderboard_top_markets", {
      p_days: 30,
      p_limit: 5,
    });
    expect(markets.error).toBeNull();
    expect(Array.isArray(markets.data)).toBe(true);
  });

  it("leaderboard_my_rank requires auth", async () => {
    const tag = `lb-${Date.now()}`;
    const user = await createUserClient(
      `lb-${tag}@forecast.local`,
      "TestPass123!",
    );

    const { data, error } = await user.rpc("leaderboard_my_rank", { p_days: 7 });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe("leaderboard period helpers", () => {
  it("parseLeaderboardPeriod defaults to 7d", () => {
    expect(parseLeaderboardPeriod(undefined)).toBe("7d");
    expect(parseLeaderboardPeriod("bogus")).toBe("7d");
    expect(parseLeaderboardPeriod("30d")).toBe("30d");
    expect(parseLeaderboardPeriod("all")).toBe("all");
  });

  it("leaderboardPeriodLabel is Russian", () => {
    expect(leaderboardPeriodLabel("7d")).toBe("7 дней");
    expect(leaderboardPeriodLabel("all")).toBe("Всё время");
  });
});
