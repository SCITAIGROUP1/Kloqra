import { describe, expect, it } from "vitest";
import {
  enumeratePeriodAnchors,
  isPeriodWithinApprovalPolicy,
  resolveApprovalEffectiveStart,
  sumHoursInPeriod
} from "./timesheet-approval-policy.util";

describe("timesheet-approval-policy.util", () => {
  const settings = { weekStart: "monday" as const, timezone: "UTC" };
  const project = {
    timesheetApprovalEnabledAt: new Date("2025-06-01T00:00:00.000Z"),
    createdAt: new Date("2025-01-01T00:00:00.000Z")
  };

  it("resolveApprovalEffectiveStart prefers enabledAt", () => {
    expect(resolveApprovalEffectiveStart(project).toISOString()).toBe("2025-06-01T00:00:00.000Z");
    expect(
      resolveApprovalEffectiveStart({
        timesheetApprovalEnabledAt: null,
        createdAt: new Date("2025-01-01T00:00:00.000Z")
      }).toISOString()
    ).toBe("2025-01-01T00:00:00.000Z");
  });

  it("isPeriodWithinApprovalPolicy excludes periods before enablement", () => {
    expect(isPeriodWithinApprovalPolicy(new Date("2025-05-31T23:59:59.999Z"), project)).toBe(false);
    expect(isPeriodWithinApprovalPolicy(new Date("2025-06-01T00:00:00.000Z"), project)).toBe(true);
  });

  it("enumeratePeriodAnchors walks weekly periods within lookback", () => {
    const anchors = enumeratePeriodAnchors(
      new Date("2025-06-02T00:00:00.000Z"),
      new Date("2025-06-16T12:00:00.000Z"),
      "weekly",
      settings
    );
    expect(anchors.length).toBeGreaterThanOrEqual(2);
    expect(anchors.length).toBeLessThanOrEqual(4);
  });

  it("sumHoursInPeriod totals logs inside the range", () => {
    const periodStart = new Date("2025-06-02T00:00:00.000Z");
    const periodEnd = new Date("2025-06-08T23:59:59.999Z");
    const hours = sumHoursInPeriod(
      [
        { startTime: new Date("2025-06-03T10:00:00.000Z"), durationSec: 3600 },
        { startTime: new Date("2025-06-09T10:00:00.000Z"), durationSec: 7200 }
      ],
      periodStart,
      periodEnd
    );
    expect(hours).toBe(1);
  });
});
