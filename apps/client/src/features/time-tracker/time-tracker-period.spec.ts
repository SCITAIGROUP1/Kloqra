import { describe, expect, it } from "vitest";
import { resolveTimeTrackerPeriod } from "./time-tracker-period";

describe("resolveTimeTrackerPeriod", () => {
  const ref = new Date(2026, 5, 10, 12, 0, 0); // Wed Jun 10 2026 local

  it("returns today bounds in UTC", () => {
    const { from, to } = resolveTimeTrackerPeriod("today", "UTC", "monday", ref);
    expect(from.toISOString()).toBe("2026-06-10T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-06-11T00:00:00.000Z");
  });

  it("returns yesterday bounds in UTC", () => {
    const { from, to } = resolveTimeTrackerPeriod("yesterday", "UTC", "monday", ref);
    expect(from.toISOString()).toBe("2026-06-09T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-06-10T00:00:00.000Z");
  });

  it("returns monday-based this week in UTC", () => {
    const { from, to } = resolveTimeTrackerPeriod("this_week", "UTC", "monday", ref);
    expect(from.toISOString()).toBe("2026-06-08T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-06-15T00:00:00.000Z");
  });

  it("returns sunday-based this week in UTC", () => {
    const { from, to } = resolveTimeTrackerPeriod("this_week", "UTC", "sunday", ref);
    expect(from.toISOString()).toBe("2026-06-07T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-06-14T00:00:00.000Z");
  });

  it("returns last week before current monday week", () => {
    const { from, to } = resolveTimeTrackerPeriod("last_week", "UTC", "monday", ref);
    expect(from.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-06-08T00:00:00.000Z");
  });

  it("returns month bounds in UTC", () => {
    const { from, to } = resolveTimeTrackerPeriod("this_month", "UTC", "monday", ref);
    expect(from.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("returns last month bounds in UTC", () => {
    const { from, to } = resolveTimeTrackerPeriod("last_month", "UTC", "monday", ref);
    expect(from.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("returns this year bounds in UTC", () => {
    const { from, to } = resolveTimeTrackerPeriod("this_year", "UTC", "monday", ref);
    expect(from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("returns last year bounds in UTC", () => {
    const { from, to } = resolveTimeTrackerPeriod("last_year", "UTC", "monday", ref);
    expect(from.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });
});
