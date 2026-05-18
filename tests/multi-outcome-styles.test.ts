import { describe, it, expect } from "vitest";
import {
  getMultiOutcomeAccent,
  MULTI_OUTCOME_ACCENTS,
  MULTI_OUTCOME_CARD_PREVIEW,
} from "@/lib/multi-outcome-styles";

describe("multi-outcome-styles", () => {
  it("cycles accents after palette length", () => {
    expect(getMultiOutcomeAccent(0)).toBe(MULTI_OUTCOME_ACCENTS[0]);
    expect(getMultiOutcomeAccent(4)).toBe(MULTI_OUTCOME_ACCENTS[0]);
    expect(getMultiOutcomeAccent(5)).toBe(MULTI_OUTCOME_ACCENTS[1]);
  });

  it("does not use rose/red accents", () => {
    for (const accent of MULTI_OUTCOME_ACCENTS) {
      expect(accent.dot).not.toMatch(/rose|red/i);
      expect(accent.border).not.toMatch(/rose|red/i);
      expect(accent.price).not.toMatch(/rose|red/i);
    }
  });

  it("previews at most three outcomes on cards", () => {
    expect(MULTI_OUTCOME_CARD_PREVIEW).toBe(3);
  });
});
