import { describe, expect, it } from "vitest";
import {
  buildExportFilename,
  formatContentDisposition,
  parseContentDispositionFilename,
  sanitizeFilenameSegment
} from "./export-filename";

describe("export-filename", () => {
  it("sanitizes unsafe segments", () => {
    expect(sanitizeFilenameSegment("Acme Corp / Q1")).toBe("acme-corp-q1");
    expect(sanitizeFilenameSegment("")).toBe("export");
  });

  it("builds dated admin export names", () => {
    expect(
      buildExportFilename({
        workspaceSlug: "Demo Workspace",
        from: "2025-05-01T00:00:00.000Z",
        to: "2025-05-31T23:59:59.000Z",
        reportSlug: "time-entries",
        ext: "csv"
      })
    ).toBe("kloqra-demo-workspace-2025-05-01_to_2025-05-31-time-entries.csv");
  });

  it("builds member-scoped names", () => {
    expect(
      buildExportFilename({
        workspaceSlug: "demo",
        from: "2025-05-01",
        to: "2025-05-07",
        scope: "member",
        ext: "pdf"
      })
    ).toBe("kloqra-demo-2025-05-01_to_2025-05-07-my-timesheet.pdf");
  });

  it("formats and parses Content-Disposition", () => {
    const name = "kloqra-demo-2025-05-01_to_2025-05-31.csv";
    const header = formatContentDisposition(name);
    expect(parseContentDispositionFilename(header)).toBe(name);
  });
});
