import { describe, it, expect } from "vitest";
import {
  ADMIN_MARKET_ARCHIVE_DAYS,
  matchesAdminTab,
} from "@/lib/admin";
import type { Market } from "@/lib/types";

function baseMarket(overrides: Partial<Market>): Market {
  return {
    id: "id",
    slug: "slug",
    title: "Title",
    description: null,
    category: "crypto",
    status: "resolved",
    closes_at: null,
    resolved_side: "yes",
    resolved_outcome_key: null,
    outcome_mode: "binary",
    is_sandbox: false,
    tags: [],
    resolution_rules: "rules",
    resolution_checklist: ["a"],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("A6 — market archive tab", () => {
  const oldResolvedAt = new Date(
    Date.now() - (ADMIN_MARKET_ARCHIVE_DAYS + 5) * 24 * 60 * 60 * 1000,
  ).toISOString();
  const recentResolvedAt = new Date(
    Date.now() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString();

  it("puts old resolved markets in archive, recent in resolved", () => {
    const archived = baseMarket({ resolved_at: oldResolvedAt });
    const recent = baseMarket({ resolved_at: recentResolvedAt });

    expect(matchesAdminTab(archived, "archive")).toBe(true);
    expect(matchesAdminTab(archived, "resolved")).toBe(false);
    expect(matchesAdminTab(recent, "resolved")).toBe(true);
    expect(matchesAdminTab(recent, "archive")).toBe(false);
  });

  it("keeps resolved without resolved_at in resolved tab", () => {
    const noDate = baseMarket({ resolved_at: null });
    expect(matchesAdminTab(noDate, "resolved")).toBe(true);
    expect(matchesAdminTab(noDate, "archive")).toBe(false);
  });
});
