import { describe, expect, it } from "vitest";
import {
  formatClockLabel,
  formatDayHeaderShort,
  formatEntryDateLabel,
  formatEntryShortDate,
  formatWeekRangeLabel
} from "./display-format";

const format = {
  timezone: "America/New_York",
  dateFormat: "MDY" as const,
  timeFormat: "12h" as const
};

describe("display-format", () => {
  it("formats entry dates using user preference", () => {
    const label = formatEntryDateLabel(new Date("2026-06-12T12:00:00.000Z"), format);
    expect(label).toContain("06/12/2026");
  });

  it("formats compact entry dates", () => {
    expect(formatEntryShortDate(new Date("2026-06-12T12:00:00.000Z"), "UTC")).toBe("Jun 12");
  });

  it("formats compact day headers for calendar columns", () => {
    const label = formatDayHeaderShort(new Date("2026-06-12T12:00:00.000Z"), format);
    expect(label).toMatch(/^Fri \d+$/);
  });

  it("formats week range using user preference", () => {
    const label = formatWeekRangeLabel(new Date("2026-06-08T12:00:00.000Z"), format);
    expect(label).toContain("–");
    expect(label).toContain("2026");
  });

  it("formats Y-axis clock labels as wall-clock hours without timezone shift", () => {
    const nineAm = formatClockLabel(9, 0, format);
    expect(nineAm).toMatch(/9(:00)?\s*AM/i);

    const tokyoNine = formatClockLabel(9, 0, {
      timezone: "Asia/Tokyo",
      dateFormat: "MDY",
      timeFormat: "24h"
    });
    expect(tokyoNine).toMatch(/^0?9(:00)?$/);
  });
});
