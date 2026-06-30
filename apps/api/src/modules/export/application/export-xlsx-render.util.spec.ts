import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildStyledXlsxBuffer, writeStyledExportSheet } from "./export-xlsx-render.util";

describe("export-xlsx-render.util", () => {
  it("writes title block, table, and SUM formulas", async () => {
    const workbook = new ExcelJS.Workbook();
    writeStyledExportSheet(
      workbook,
      {
        name: "Alex — Time entries",
        report: "time_entries",
        columnKeys: ["member", "hours", "amount"],
        headers: ["Member", "Hours", "Amount"],
        lines: [
          ["Alex", 2, 200],
          ["Sam", 3, 300]
        ]
      },
      {
        workspaceName: "Acme Corp",
        from: "2025-06-02T00:00:00.000Z",
        to: "2025-06-06T23:59:59.999Z",
        purposeSlug: "payroll-timesheets",
        settings: { exportFooterNote: "Prepared for payroll review" }
      },
      1
    );

    const ws = workbook.getWorksheet("Alex — Time entries");
    expect(ws).toBeDefined();
    expect(ws!.getCell(1, 1).value).toBe("Payroll & timesheets");
    expect(String(ws!.getCell(2, 1).value)).toContain("Acme Corp");

    const headerRow = 4;
    expect(ws!.getRow(headerRow).getCell(1).value).toBe("Member");

    const totalRow = headerRow + 3;
    const hoursFormula = ws!.getRow(totalRow).getCell(2).value;
    expect(hoursFormula).toMatchObject({
      formula: expect.stringContaining("SUM(B")
    });
  });

  it("builds a workbook buffer for multi-sheet exports", async () => {
    const buffer = await buildStyledXlsxBuffer(
      [
        {
          name: "Invoice",
          report: "invoice",
          columnKeys: ["hours", "amount", "description"],
          headers: ["Hours", "Amount", "Description"],
          lines: [[1, 100, "Work"]]
        }
      ],
      {
        workspaceName: "Acme",
        from: "2025-06-01T00:00:00.000Z",
        to: "2025-06-07T23:59:59.999Z",
        purposeSlug: "client-billing",
        settings: {}
      }
    );

    expect(buffer.byteLength).toBeGreaterThan(1000);
    const parsed = await new ExcelJS.Workbook().xlsx.load(buffer);
    expect(parsed.worksheets).toHaveLength(1);
    expect(parsed.worksheets[0]?.name).toBe("Invoice");
  });
});
