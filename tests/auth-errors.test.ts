import { describe, expect, it } from "vitest";
import {
  mapAuthCallbackError,
  mapMagicLinkError,
  mapOAuthStartError,
} from "@/lib/auth-errors";

describe("mapAuthCallbackError", () => {
  it("maps access denied", () => {
    expect(mapAuthCallbackError("access_denied", null)).toBe("Вход отменён.");
  });

  it("maps disabled provider", () => {
    expect(
      mapAuthCallbackError(
        "invalid_request",
        "Provider google is not enabled",
      ),
    ).toContain("не настроен");
  });
});

describe("mapMagicLinkError", () => {
  it("maps rate limit", () => {
    expect(mapMagicLinkError("Email rate limit exceeded")).toContain(
      "Слишком много",
    );
  });
});

describe("mapOAuthStartError", () => {
  it("maps disabled provider", () => {
    expect(mapOAuthStartError("Provider github is not enabled")).toContain(
      "не настроен",
    );
  });
});
