import { describe, expect, it } from "vitest";
import {
  applyDatePreset,
  describeExportPeriodApplied,
  formatExportPeriodLabel,
  matchExportDatePreset
} from "./export-date-presets";

describe("export-date-presets", () => {
  it("matches the active quick range preset", () => {
    const range = applyDatePreset("30d");
    expect(matchExportDatePreset(range.from, range.to)).toBe("30d");
  });

  it("returns null when the range is custom", () => {
    expect(matchExportDatePreset("2020-01-01", "2020-01-02")).toBeNull();
  });

  it("formats applied period labels", () => {
    const range = applyDatePreset("30d");
    expect(formatExportPeriodLabel(range.from, range.to)).toMatch(/–/);
    expect(describeExportPeriodApplied(range.from, range.to)).toContain("30 days");
  });
});
