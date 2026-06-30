import { describe, expect, it } from "vitest";
import {
  formatTimeTrackerRangeLabel,
  inclusiveDateKeysFromPeriod,
  matchTimeTrackerPeriod,
  resolveTimeTrackerDateRange,
  resolveTimeTrackerPeriod
} from "./time-tracker-period";

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

describe("inclusiveDateKeysFromPeriod", () => {
  const ref = new Date(2026, 5, 10, 12, 0, 0);

  it("returns inclusive keys for this week", () => {
    expect(inclusiveDateKeysFromPeriod("this_week", "UTC", "monday", ref)).toEqual({
      from: "2026-06-08",
      to: "2026-06-14"
    });
  });
});

describe("resolveTimeTrackerDateRange", () => {
  it("returns exclusive UTC bounds for inclusive date keys", () => {
    const { from, to } = resolveTimeTrackerDateRange("2026-06-08", "2026-06-14", "UTC");
    expect(from.toISOString()).toBe("2026-06-08T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-06-15T00:00:00.000Z");
  });

  it("swaps inverted date keys", () => {
    const { from, to } = resolveTimeTrackerDateRange("2026-06-14", "2026-06-08", "UTC");
    expect(from.toISOString()).toBe("2026-06-08T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-06-15T00:00:00.000Z");
  });
});

describe("matchTimeTrackerPeriod", () => {
  const ref = new Date(2026, 5, 10, 12, 0, 0);

  it("matches preset ranges", () => {
    const keys = inclusiveDateKeysFromPeriod("this_week", "UTC", "monday", ref);
    expect(matchTimeTrackerPeriod(keys.from, keys.to, "UTC", "monday", ref)).toBe("this_week");
  });

  it("returns custom for unmatched ranges", () => {
    expect(matchTimeTrackerPeriod("2026-06-01", "2026-06-05", "UTC", "monday", ref)).toBe("custom");
  });
});

describe("formatTimeTrackerRangeLabel", () => {
  it("formats a single day", () => {
    expect(formatTimeTrackerRangeLabel("2026-06-08", "2026-06-08", "UTC")).toBe("Jun 8");
  });

  it("formats a span", () => {
    expect(formatTimeTrackerRangeLabel("2026-06-01", "2026-06-14", "UTC")).toBe("Jun 1 – Jun 14");
  });
});
