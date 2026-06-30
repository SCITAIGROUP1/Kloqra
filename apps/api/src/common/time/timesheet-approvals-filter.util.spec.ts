import { describe, expect, it } from "vitest";
import { buildPeriodStartRange, matchesPeriodStartFilter } from "./timesheet-approvals-filter.util";

describe("timesheet-approvals-filter.util", () => {
  it("builds period start range with end-of-day upper bound", () => {
    const range = buildPeriodStartRange({
      from: "2026-03-01T00:00:00.000Z",
      to: "2026-03-31T00:00:00.000Z"
    });
    expect(range?.gte?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(range?.lte?.getUTCHours()).toBe(23);
  });

  it("matches period start inside filter range", () => {
    expect(
      matchesPeriodStartFilter("2026-03-15T00:00:00.000Z", {
        from: "2026-03-01",
        to: "2026-03-31"
      })
    ).toBe(true);
    expect(
      matchesPeriodStartFilter("2026-04-01T00:00:00.000Z", {
        from: "2026-03-01",
        to: "2026-03-31"
      })
    ).toBe(false);
  });
});
