import {
  exportPreviewBodySchema,
  exportPreviewResponseSchema,
  exportReportTypeSchema
} from "@kloqra/contracts";
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
    expect(exportReportTypeSchema.options).toContain("member_daily_total");
    expect(exportReportTypeSchema.options).toContain("timesheet_approval_status");
  });

  it("merges legacy singular scope ids into arrays", () => {
    const parsed = exportPreviewBodySchema.parse({
      from: "2025-06-01T00:00:00.000Z",
      to: "2025-06-30T23:59:59.000Z",
      reportTypes: ["time_entries"],
      projectId: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222"
    });
    expect(parsed.projectIds).toEqual(["11111111-1111-4111-8111-111111111111"]);
    expect(parsed.userIds).toEqual(["22222222-2222-4222-8222-222222222222"]);
  });

  it("accepts optional column overrides for sample preview", () => {
    const parsed = exportPreviewBodySchema.parse({
      from: "2025-06-01T00:00:00.000Z",
      to: "2025-06-30T23:59:59.000Z",
      reportTypes: ["time_entries"],
      columns: {
        time_entries: ["project", "hours", "description"]
      }
    });
    expect(parsed.columns?.time_entries).toEqual(["project", "hours", "description"]);
  });

  it("accepts sampleReportType to focus preview on one report", () => {
    const parsed = exportPreviewBodySchema.parse({
      from: "2025-06-01T00:00:00.000Z",
      to: "2025-06-30T23:59:59.000Z",
      reportTypes: ["time_entries", "by_member"],
      sampleReportType: "by_member"
    });
    expect(parsed.sampleReportType).toBe("by_member");
  });
});

describe("export preview response", () => {
  it("accepts sample rows and large export flags", () => {
    const parsed = exportPreviewResponseSchema.parse({
      counts: { time_entries: 3 },
      totalLogRows: 3,
      isEmpty: false,
      sheets: [{ name: "Time entries", rowCount: 3, kind: "report" }],
      headline: "3 entries",
      detail: "detail",
      sampleRows: [
        {
          reportType: "time_entries",
          sheetName: "Taylor Brooks — Time entries",
          columns: ["Date", "Hours"],
          rows: [{ Date: "2025-06-01", Hours: 8 }]
        }
      ],
      estimatedRowCount: 3,
      warnLargeExport: false
    });
    expect(parsed.sampleRows).toHaveLength(1);
    expect(parsed.warnLargeExport).toBe(false);
  });
});
