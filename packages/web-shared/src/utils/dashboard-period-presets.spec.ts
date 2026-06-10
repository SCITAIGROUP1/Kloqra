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
    expect(applyDashboardPeriodPreset("today")).toEqual({
      from: "2026-06-10",
      to: "2026-06-10"
    });
  });

  it("returns Monday through today for this week preset", () => {
    expect(applyDashboardPeriodPreset("week")).toEqual({
      from: "2026-06-08",
      to: "2026-06-10"
    });
  });

  it("returns first of month through today for this month preset", () => {
    expect(applyDashboardPeriodPreset("month")).toEqual({
      from: "2026-06-01",
      to: "2026-06-10"
    });
  });

  it("matches a preset from custom date inputs", () => {
    expect(matchDashboardPeriodPreset("2026-06-08", "2026-06-10", ["week", "month"])).toBe("week");
    expect(matchDashboardPeriodPreset("2026-06-01", "2026-06-10", ["week", "month"])).toBe("month");
    expect(matchDashboardPeriodPreset("2026-06-05", "2026-06-10", ["week", "month"])).toBeNull();
  });
});
