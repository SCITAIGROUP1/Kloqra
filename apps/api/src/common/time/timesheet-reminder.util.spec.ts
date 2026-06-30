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

  it("handles DST spring forward boundary in America/New_York", () => {
    // 2024-03-10 is the spring forward date in New York.
    const periodEnd = new Date("2024-03-11T03:59:59.999Z"); // 2024-03-10T23:59:59.999-04:00

    // 3 PM (15:00) local time on 2024-03-10 is 2024-03-10T19:00:00Z
    const beforeHour = new Date("2024-03-10T19:00:00Z");
    // 4 PM (16:00) local time on 2024-03-10 is 2024-03-10T20:00:00Z
    const afterHour = new Date("2024-03-10T20:00:00Z");

    expect(isTimesheetReminderWindow(beforeHour, periodEnd, "America/New_York", 16)).toBe(false);
    expect(isTimesheetReminderWindow(afterHour, periodEnd, "America/New_York", 16)).toBe(true);
  });

  it("handles DST fallback boundary in America/Chicago", () => {
    // 2024-11-03 is the fallback date in Chicago.
    const periodEnd = new Date("2024-11-04T05:59:59.999Z"); // 2024-11-03T23:59:59.999-06:00

    // 3 PM (15:00) local time on 2024-11-03 is 2024-11-03T21:00:00Z
    const beforeHour = new Date("2024-11-03T21:00:00Z");
    // 4 PM (16:00) local time on 2024-11-03 is 2024-11-03T22:00:00Z
    const afterHour = new Date("2024-11-03T22:00:00Z");

    expect(isTimesheetReminderWindow(beforeHour, periodEnd, "America/Chicago", 16)).toBe(false);
    expect(isTimesheetReminderWindow(afterHour, periodEnd, "America/Chicago", 16)).toBe(true);
  });
});
