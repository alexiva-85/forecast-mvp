import { describe, expect, it } from "vitest";
import { buildAuthCallbackUrl } from "@/lib/auth-callback-url";
import { safeAuthRedirect } from "@/lib/auth-redirect";

describe("safeAuthRedirect", () => {
  it("allows safe relative paths", () => {
    expect(safeAuthRedirect("/portfolio")).toBe("/portfolio");
    expect(safeAuthRedirect("/admin")).toBe("/admin");
  });

  it("blocks open redirects", () => {
    expect(safeAuthRedirect("//evil.com")).toBe("/");
    expect(safeAuthRedirect("https://evil.com")).toBe("/");
    expect(safeAuthRedirect(null)).toBe("/");
  });
});

describe("buildAuthCallbackUrl", () => {
  it("builds callback without next for default", () => {
    expect(buildAuthCallbackUrl("https://forecast.test")).toBe(
      "https://forecast.test/auth/callback",
    );
  });

  it("includes next when not home", () => {
    const url = buildAuthCallbackUrl("https://forecast.test", "/portfolio");
    expect(url).toBe(
      "https://forecast.test/auth/callback?next=%2Fportfolio",
    );
  });
});
