import { describe, expect, it } from "vitest";
import {
  applyPurposeColumnPreset,
  buildSplitSheetName,
  excelColumnLetter,
  findTotalLabelColumnIndex,
  getExportXlsxTemplate,
  purposeTitleFromSlug,
  resolveExportXlsxTheme,
  sanitizeExcelTableName,
  stripBuiltInTotalRow
} from "./export-xlsx-template.util";

describe("export-xlsx-template.util", () => {
  it("maps purpose slugs to HR-friendly titles", () => {
    expect(purposeTitleFromSlug("payroll-timesheets")).toBe("Payroll & timesheets");
    expect(purposeTitleFromSlug("client-billing")).toBe("Client billing pack");
  });

  it("builds split tab names with report short label", () => {
    expect(buildSplitSheetName("Alex Rivera", "time_entries")).toBe("Alex Rivera — Time entries");
  });

  it("converts column indexes to Excel letters", () => {
    expect(excelColumnLetter(0)).toBe("A");
    expect(excelColumnLetter(25)).toBe("Z");
    expect(excelColumnLetter(26)).toBe("AA");
  });

  it("omits billing-noise columns for client billing preset", () => {
    const keys = applyPurposeColumnPreset(
      ["workspace", "client", "member", "email", "hours", "amount"],
      "time_entries",
      "client-billing"
    );
    expect(keys).toEqual(["client", "hours", "amount"]);
  });

  it("keeps payroll columns lean", () => {
    const keys = applyPurposeColumnPreset(
      ["workspace", "member", "hours", "rate", "amount", "source"],
      "time_entries",
      "payroll-timesheets"
    );
    expect(keys).toEqual(["member", "hours"]);
  });

  it("strips invoice TOTAL row before xlsx formulas", () => {
    const lines = stripBuiltInTotalRow(
      "invoice",
      ["hours", "amount", "description"],
      [
        [2, 100, "Work"],
        [0, 100, "TOTAL"]
      ]
    );
    expect(lines).toHaveLength(1);
  });

  it("finds a label column for totals row", () => {
    const template = getExportXlsxTemplate("time_entries");
    expect(findTotalLabelColumnIndex(["member", "hours", "amount"], template)).toBe(0);
  });

  it("sanitizes Excel table names", () => {
    expect(sanitizeExcelTableName("Alex — Hours", 2)).toMatch(/^Kq_/);
  });

  it("resolves brand theme from workspace color", () => {
    const theme = resolveExportXlsxTheme("1A2B3C");
    expect(theme.headerBg).toBe("FF1A2B3C");
  });
});
