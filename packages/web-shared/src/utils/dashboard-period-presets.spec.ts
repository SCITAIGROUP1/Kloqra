import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyDashboardPeriodPreset, matchDashboardPeriodPreset } from "./dashboard-period-presets";

describe("dashboard-period-presets", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns today for today preset", () => {
    expect(applyDashboardPeriodPreset("today", "UTC")).toEqual({
      from: "2026-06-10",
      to: "2026-06-10"
    });
  });

  it("returns Monday through Sunday for this week preset", () => {
    expect(applyDashboardPeriodPreset("week", "UTC")).toEqual({
      from: "2026-06-08",
      to: "2026-06-14"
    });
  });

  it("returns first of month through today for this month preset", () => {
    expect(applyDashboardPeriodPreset("month", "UTC")).toEqual({
      from: "2026-06-01",
      to: "2026-06-10"
    });
  });

  it("returns 2000-01-01 through today for all time preset", () => {
    expect(applyDashboardPeriodPreset("all", "UTC")).toEqual({
      from: "2000-01-01",
      to: "2026-06-10"
    });
  });

  it("matches a preset from custom date inputs", () => {
    expect(matchDashboardPeriodPreset("2026-06-08", "2026-06-14", ["week", "month"], "UTC")).toBe(
      "week"
    );
    expect(matchDashboardPeriodPreset("2026-06-01", "2026-06-10", ["week", "month"], "UTC")).toBe(
      "month"
    );
    expect(matchDashboardPeriodPreset("2000-01-01", "2026-06-10", ["all"], "UTC")).toBe("all");
    expect(
      matchDashboardPeriodPreset("2026-06-05", "2026-06-10", ["week", "month"], "UTC")
    ).toBeNull();
  });
});
