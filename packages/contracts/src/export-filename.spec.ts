import { describe, expect, it } from "vitest";
import {
  buildExportFilename,
  buildExportScopeHint,
  deriveExportPurpose,
  formatContentDisposition,
  formatExportDateRange,
  parseContentDispositionFilename,
  sanitizeFilenameSegment
} from "./export-filename";

describe("export-filename", () => {
  it("sanitizes unsafe segments", () => {
    expect(sanitizeFilenameSegment("Acme Corp / Q1")).toBe("acme-corp-q1");
    expect(sanitizeFilenameSegment("")).toBe("export");
  });

  it("formats smart date ranges", () => {
    expect(formatExportDateRange("2025-06-18T00:00:00.000Z", "2025-06-18T23:59:59.000Z")).toBe(
      "jun-18-2025"
    );
    expect(formatExportDateRange("2025-06-01T00:00:00.000Z", "2025-06-18T23:59:59.000Z")).toBe(
      "jun-1-to-18-2025"
    );
    expect(formatExportDateRange("2025-06-01T00:00:00.000Z", "2025-06-30T23:59:59.000Z")).toBe(
      "jun-2025"
    );
    expect(formatExportDateRange("2025-05-15T00:00:00.000Z", "2025-06-18T23:59:59.000Z")).toBe(
      "2025-05-15_to_2025-06-18"
    );
  });

  it("builds purpose-driven admin export names", () => {
    expect(
      buildExportFilename({
        workspaceSlug: "Demo Workspace",
        from: "2025-05-01T00:00:00.000Z",
        to: "2025-05-31T23:59:59.000Z",
        purposeSlug: "payroll-timesheets",
        ext: "xlsx"
      })
    ).toBe("kloqra-demo-workspace-payroll-timesheets-may-2025.xlsx");
  });

  it("builds member-scoped names", () => {
    expect(
      buildExportFilename({
        workspaceSlug: "demo",
        from: "2025-05-01",
        to: "2025-05-07",
        scope: "member",
        purposeSlug: "my-timesheet",
        ext: "pdf"
      })
    ).toBe("kloqra-demo-my-timesheet-may-1-to-7-2025.pdf");
  });

  it("includes scope hints", () => {
    expect(
      buildExportFilename({
        workspaceSlug: "demo",
        from: "2025-06-01",
        to: "2025-06-30",
        purposeSlug: "payroll-timesheets",
        scopeHint: "brand-campaign",
        ext: "xlsx"
      })
    ).toBe("kloqra-demo-payroll-timesheets-brand-campaign-jun-2025.xlsx");
  });

  it("derives purpose from body", () => {
    expect(
      deriveExportPurpose({
        reportTypes: ["time_entries"],
        sheetLayout: "tabs_per_member"
      })
    ).toBe("timesheets-by-person");
    expect(
      deriveExportPurpose({
        exportPurpose: "client-billing",
        reportTypes: ["invoice"],
        sheetLayout: "standard"
      })
    ).toBe("client-billing");
  });

  it("builds scope hints from filters", () => {
    expect(
      buildExportScopeHint({
        projectIds: ["p1"],
        projectNames: ["Brand Campaign"]
      })
    ).toBe("brand-campaign");
    expect(buildExportScopeHint({ userIds: ["u1", "u2", "u3"] })).toBe("3-people");
  });

  it("formats and parses Content-Disposition", () => {
    const name = "kloqra-demo-payroll-timesheets-may-2025.xlsx";
    const header = formatContentDisposition(name);
    expect(parseContentDispositionFilename(header)).toBe(name);
  });

  it("falls back for invalid dates and extensions", () => {
    expect(
      buildExportFilename({
        workspaceSlug: "demo",
        from: "not-a-date",
        to: "also-bad",
        ext: "bad ext!"
      })
    ).toBe("kloqra-demo-export-unknown-date.bin");
  });
});
