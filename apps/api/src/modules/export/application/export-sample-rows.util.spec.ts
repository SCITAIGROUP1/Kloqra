import { describe, expect, it } from "vitest";
import { buildExportPreviewSampleRows } from "./export-sample-rows.util";

describe("buildExportPreviewSampleRows", () => {
  const sheets = [
    {
      name: "Taylor Brooks — Time entries",
      report: "time_entries" as const,
      headers: ["Project", "Hours", "Member"],
      lines: [
        ["Portal", 8, "Taylor Brooks"],
        ["Website", 4, "Taylor Brooks"]
      ]
    },
    {
      name: "By member",
      report: "by_member" as const,
      headers: ["Member", "Hours"],
      lines: [["Taylor Brooks", 12]]
    }
  ];

  it("returns one sample per selected report when reportTypes is provided", () => {
    const sample = buildExportPreviewSampleRows(sheets, {
      reportTypes: ["time_entries", "by_member"]
    });
    expect(sample).toHaveLength(2);
    expect(sample[0]?.reportType).toBe("time_entries");
    expect(sample[1]?.reportType).toBe("by_member");
  });

  it("uses projected sheet headers and row order", () => {
    const sample = buildExportPreviewSampleRows(sheets);
    expect(sample).toHaveLength(1);
    expect(sample[0]?.columns).toEqual(["Project", "Hours", "Member"]);
    expect(sample[0]?.rows[0]).toEqual({
      Project: "Portal",
      Hours: 8,
      Member: "Taylor Brooks"
    });
    expect(sample[0]?.sheetName).toBe("Taylor Brooks — Time entries");
  });

  it("focuses on the report being edited", () => {
    const sample = buildExportPreviewSampleRows(sheets, { focusReport: "by_member" });
    expect(sample[0]?.reportType).toBe("by_member");
    expect(sample[0]?.columns).toEqual(["Member", "Hours"]);
    expect(sample[0]?.sheetName).toBe("By member");
  });

  it("limits rows", () => {
    const manyLines = Array.from({ length: 10 }, (_, i) => ["Portal", i, "Taylor"]);
    const sample = buildExportPreviewSampleRows(
      [
        {
          name: "Time entries",
          report: "time_entries",
          headers: ["Project", "Hours", "Member"],
          lines: manyLines
        }
      ],
      { maxRows: 3 }
    );
    expect(sample[0]?.rows).toHaveLength(3);
  });

  it("returns empty when no sheets have data", () => {
    expect(
      buildExportPreviewSampleRows([
        {
          name: "Empty",
          report: "time_entries",
          headers: ["Project"],
          lines: []
        }
      ])
    ).toEqual([]);
  });
});
