import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  formatDateRangeLabel,
  isDateKeyInRange,
  isSameMonthKey,
  normalizeDateRange,
  toDateKey,
  weekBoundsForDateKey
} from "./date-keys.js";

describe("date-keys", () => {
  it("normalizes inverted ranges", () => {
    expect(normalizeDateRange("2026-06-14", "2026-06-08")).toEqual({
      from: "2026-06-08",
      to: "2026-06-14"
    });
  });

  it("detects keys inside a range", () => {
    expect(isDateKeyInRange("2026-06-10", "2026-06-08", "2026-06-14")).toBe(true);
    expect(isDateKeyInRange("2026-06-15", "2026-06-08", "2026-06-14")).toBe(false);
  });

  it("formats range labels", () => {
    expect(formatDateRangeLabel("2026-06-08", "2026-06-08")).toBe("Jun 8, 2026");
    expect(formatDateRangeLabel("2026-06-08", "2026-06-14")).toBe("Jun 8 – Jun 14, 2026");
  });

  it("builds a padded month grid", () => {
    const weeks = buildMonthGrid(2026, 6, 1);
    expect(weeks[0]?.filter(Boolean)).toHaveLength(7);
    expect(
      weeks
        .flat()
        .filter(Boolean)
        .map((key) => key?.split("-")[2])
    ).toContain("01");
    expect(toDateKey(2026, 6, 30)).toBe("2026-06-30");
  });

  it("returns monday-based week bounds for a date key", () => {
    expect(weekBoundsForDateKey("2026-06-10", 1)).toEqual({
      from: "2026-06-08",
      to: "2026-06-14"
    });
  });

  it("detects same-month keys", () => {
    expect(isSameMonthKey("2026-06-08", "2026-06-30")).toBe(true);
    expect(isSameMonthKey("2026-06-30", "2026-07-01")).toBe(false);
  });
});
