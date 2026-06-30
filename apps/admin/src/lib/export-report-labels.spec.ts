import { describe, expect, it } from "vitest";
import { exportReportLabel } from "./export-report-labels";

describe("export-report-labels", () => {
  it("returns human labels for export report types", () => {
    expect(exportReportLabel("time_entries")).toBe("Time entries");
    expect(exportReportLabel("by_member")).toBe("By member");
  });
});
