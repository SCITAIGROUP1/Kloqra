import { describe, expect, it } from "vitest";
import {
  formatReminderDueLabel,
  getLocalHour,
  isSameLocalCalendarDay,
  isTimesheetReminderWindow,
  TIMESHEET_REMINDER_LOCAL_HOUR
} from "./timesheet-reminder.util";

describe("timesheet-reminder.util", () => {
  it("detects same local calendar day in a timezone", () => {
    const a = new Date("2026-06-13T06:00:00.000Z");
    const b = new Date("2026-06-13T22:00:00.000Z");
    expect(isSameLocalCalendarDay(a, b, "America/New_York")).toBe(true);
    expect(isSameLocalCalendarDay(a, b, "UTC")).toBe(true);
  });

  it("opens reminder window on period end day after the configured hour", () => {
    const periodEnd = new Date("2026-06-13T23:59:59.999Z");
    const beforeHour = new Date("2026-06-13T14:00:00.000Z");
    const afterHour = new Date("2026-06-13T21:00:00.000Z");

    expect(isTimesheetReminderWindow(beforeHour, periodEnd, "UTC", 16)).toBe(false);
    expect(isTimesheetReminderWindow(afterHour, periodEnd, "UTC", 16)).toBe(true);
    expect(getLocalHour(afterHour, "UTC")).toBeGreaterThanOrEqual(TIMESHEET_REMINDER_LOCAL_HOUR);
  });

  it("formats due labels in the workspace timezone", () => {
    const periodEnd = new Date("2026-06-13T23:59:59.999Z");
    const label = formatReminderDueLabel(periodEnd, "UTC");
    expect(label).toContain("Jun");
    expect(label).toContain("13");
  });
});
