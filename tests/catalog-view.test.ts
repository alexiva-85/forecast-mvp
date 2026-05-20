import { describe, expect, it } from "vitest";
import {
  catalogViewLabel,
  parseCatalogView,
  PUBLIC_RESOLVED_CATALOG_DAYS,
} from "@/lib/markets";

describe("catalog view", () => {
  it("defaults to active", () => {
    expect(parseCatalogView()).toBe("active");
    expect(parseCatalogView("")).toBe("active");
    expect(parseCatalogView("active")).toBe("active");
    expect(parseCatalogView("unknown")).toBe("active");
  });

  it("parses resolved", () => {
    expect(parseCatalogView("resolved")).toBe("resolved");
  });

  it("labels views in Russian", () => {
    expect(catalogViewLabel("active")).toBe("Торгуются");
    expect(catalogViewLabel("resolved")).toBe("Завершённые");
  });

  it("uses same resolved window as admin archive", () => {
    expect(PUBLIC_RESOLVED_CATALOG_DAYS).toBe(30);
  });
});
