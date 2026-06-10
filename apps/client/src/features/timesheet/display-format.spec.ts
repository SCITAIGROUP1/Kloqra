import { describe, expect, it } from "vitest";
import { formatEntryDateLabel, formatEntryShortDate, formatWeekRangeLabel } from "./display-format";

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

  it("formats week range using user preference", () => {
    const label = formatWeekRangeLabel(new Date("2026-06-08T12:00:00.000Z"), format);
    expect(label).toContain("–");
    expect(label).toContain("2026");
  });
});
