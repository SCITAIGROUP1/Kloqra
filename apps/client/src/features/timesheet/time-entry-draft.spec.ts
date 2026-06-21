import { describe, expect, it } from "vitest";
import { estimateRecurrenceCount } from "./time-entry-draft";

describe("estimateRecurrenceCount", () => {
  it("counts daily entries inclusive", () => {
    expect(estimateRecurrenceCount("2026-06-09", "2026-06-11", "daily")).toBe(3);
  });

  it("skips weekends for weekdays recurrence", () => {
    // Mon Jun 8 through Sun Jun 14, 2026
    expect(estimateRecurrenceCount("2026-06-08", "2026-06-14", "weekdays")).toBe(5);
  });

  it("counts weekly entries on matching weekday only", () => {
    // Tue Jun 9 through Tue Jun 23
    expect(estimateRecurrenceCount("2026-06-09", "2026-06-23", "weekly")).toBe(3);
  });

  it("returns zero when end is before start", () => {
    expect(estimateRecurrenceCount("2026-06-12", "2026-06-10", "daily")).toBe(0);
  });
});
