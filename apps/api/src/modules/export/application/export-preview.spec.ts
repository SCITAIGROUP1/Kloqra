import { exportPreviewBodySchema, exportReportTypeSchema } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";

describe("export preview contracts", () => {
  it("accepts preview body without format", () => {
    const parsed = exportPreviewBodySchema.parse({
      from: "2025-06-01T00:00:00.000Z",
      to: "2025-06-30T23:59:59.000Z",
      reportTypes: ["time_entries", "by_project"],
      sheetLayout: "standard"
    });
    expect(parsed.reportTypes).toHaveLength(2);
    expect(parsed.sheetLayout).toBe("standard");
  });

  it("normalizes legacy single groupBy and accepts combination arrays", () => {
    expect(
      exportPreviewBodySchema.parse({
        from: "2025-06-01T00:00:00.000Z",
        to: "2025-06-30T23:59:59.000Z",
        reportTypes: ["time_entries"],
        groupBy: "member"
      }).groupBy
    ).toEqual(["member"]);

    expect(
      exportPreviewBodySchema.parse({
        from: "2025-06-01T00:00:00.000Z",
        to: "2025-06-30T23:59:59.000Z",
        reportTypes: ["time_entries", "by_project", "by_member"],
        groupBy: ["client", "project", "member"]
      }).groupBy
    ).toEqual(["client", "project", "member"]);
  });

  it("includes all admin report types", () => {
    expect(exportReportTypeSchema.options).toContain("invoice");
    expect(exportReportTypeSchema.options).toContain("utilization");
    expect(exportReportTypeSchema.options).toContain("by_client");
  });
});
