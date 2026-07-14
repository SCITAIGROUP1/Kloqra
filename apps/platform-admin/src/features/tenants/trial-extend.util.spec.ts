import { describe, expect, it } from "vitest";
import { previewTrialEndsAtFromDays } from "./trial-extend.util";

describe("previewTrialEndsAtFromDays", () => {
  const now = new Date("2026-07-14T12:00:00.000Z");

  it("extends from current end when still active", () => {
    const result = previewTrialEndsAtFromDays("2026-07-20T12:00:00.000Z", 7, now);
    expect(result.toISOString()).toBe("2026-07-27T12:00:00.000Z");
  });

  it("extends from now when expired", () => {
    const result = previewTrialEndsAtFromDays("2026-07-01T12:00:00.000Z", 14, now);
    expect(result.toISOString()).toBe("2026-07-28T12:00:00.000Z");
  });
});
