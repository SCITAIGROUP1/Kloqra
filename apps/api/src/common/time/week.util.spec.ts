import { describe, expect, it } from "vitest";
import {
  countWeekdaysInclusive,
  daysInRange,
  expectedHoursForRange,
  formatWeekLabel,
  getWeekStartUtc
} from "./week.util";

describe("week.util", () => {
  it("getWeekStartUtc monday week", () => {
    const wed = new Date("2024-01-10T12:00:00Z");
    expect(getWeekStartUtc(wed, "monday")).toBe("2024-01-08");
  });

  it("formatWeekLabel", () => {
    expect(formatWeekLabel("2024-01-08")).toBe("Week of 2024-01-08");
  });

  it("daysInRange", () => {
    const from = new Date("2024-01-01");
    const to = new Date("2024-01-03");
    expect(daysInRange(from, to)).toBeGreaterThanOrEqual(1);
  });

  it("countWeekdaysInclusive skips weekends", () => {
    const from = new Date("2024-01-08T00:00:00.000Z");
    const to = new Date("2024-01-14T23:59:59.999Z");
    expect(countWeekdaysInclusive(from, to)).toBe(5);
  });

  it("expectedHoursForRange uses weekdays only", () => {
    const from = new Date("2024-01-08T00:00:00.000Z");
    const to = new Date("2024-01-14T23:59:59.999Z");
    expect(expectedHoursForRange(from, to, 40)).toBe(40);
  });
});
