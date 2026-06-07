import { describe, expect, it } from "vitest";
import { getPeriodRange } from "./approval-period.util";

describe("getPeriodRange", () => {
  const settings = { weekStart: "monday" as const, timezone: "UTC" };

  it("returns weekly range", () => {
    const { periodStart, periodEnd, approvalPeriod } = getPeriodRange(
      "2025-01-08T12:00:00.000Z",
      "weekly",
      settings
    );
    expect(approvalPeriod).toBe("weekly");
    expect(periodStart.toISOString()).toBe("2025-01-06T00:00:00.000Z");
    expect(periodEnd.getUTCDay()).toBe(0);
  });

  it("returns daily range", () => {
    const { periodStart, periodEnd } = getPeriodRange(
      "2025-01-08T12:00:00.000Z",
      "daily",
      settings
    );
    expect(periodStart.toISOString()).toBe("2025-01-08T00:00:00.000Z");
    expect(periodEnd.getUTCDate()).toBe(8);
  });

  it("returns monthly range", () => {
    const { periodStart, periodEnd } = getPeriodRange(
      "2025-01-15T12:00:00.000Z",
      "monthly",
      settings
    );
    expect(periodStart.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    expect(periodEnd.getUTCMonth()).toBe(0);
    expect(periodEnd.getUTCDate()).toBe(31);
  });
});
