import type { WorkspaceSettings } from "@kloqra/contracts";
import ExcelJS from "exceljs";
import type { ExportCellValue } from "./export-render.util";
import {
  buildSheetSubtitle,
  excelColumnLetter,
  findTotalLabelColumnIndex,
  getExportXlsxTemplate,
  purposeTitleFromSlug,
  resolveExportXlsxTheme,
  sanitizeExcelTableName,
  stripBuiltInTotalRow,
  type ExportSheetReport,
  type ExportXlsxTemplate
} from "./export-xlsx-template.util";

export type ExportSheetPayload = {
  name: string;
  report: ExportSheetReport;
  columnKeys: string[];
  headers: string[];
  lines: ExportCellValue[][];
};

export type XlsxWorkbookMeta = {
  workspaceName: string;
  from: string;
  to: string;
  purposeSlug: string;
  scopeHint?: string;
  settings: WorkspaceSettings;
};

function readBrandColor(settings: WorkspaceSettings): string | undefined {
  const raw = settings as WorkspaceSettings & { primaryColor?: string; brandColor?: string };
  const candidate = raw.primaryColor ?? raw.brandColor;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : undefined;
}

function applyCellNumberFormat(
  cell: ExcelJS.Cell,
  columnKey: string,
  template: ExportXlsxTemplate,
  currencyCode: string | undefined
): void {
  if (template.hoursColumns.includes(columnKey)) {
    cell.numFmt = "0.00";
    return;
  }
  if (template.currencyColumns.includes(columnKey)) {
    const code = currencyCode ?? "USD";
    cell.numFmt = `"${code} "#,##0.00`;
    return;
  }
  if (template.percentColumns.includes(columnKey)) {
    cell.numFmt = "0.00%";
  }
}

function titleRowCount(meta: XlsxWorkbookMeta): number {
  return meta.settings.exportFooterNote?.trim() ? 3 : 2;
}

export function writeStyledExportSheet(
  workbook: ExcelJS.Workbook,
  sheet: ExportSheetPayload,
  meta: XlsxWorkbookMeta,
  sheetIndex: number
): void {
  const ws = workbook.addWorksheet(sheet.name);
  const template = getExportXlsxTemplate(sheet.report);
  const theme = resolveExportXlsxTheme(readBrandColor(meta.settings));
  const dataLines = stripBuiltInTotalRow(sheet.report, sheet.columnKeys, sheet.lines);
  const colCount = Math.max(sheet.headers.length, 1);
  const titleRows = titleRowCount(meta);

  ws.mergeCells(1, 1, 1, colCount);
  ws.getCell(1, 1).value = purposeTitleFromSlug(meta.purposeSlug);
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: theme.titleFg } };

  ws.mergeCells(2, 1, 2, colCount);
  ws.getCell(2, 1).value = buildSheetSubtitle({
    workspaceName: meta.workspaceName,
    from: meta.from,
    to: meta.to,
    scopeHint: meta.scopeHint
  });
  ws.getCell(2, 1).font = { size: 10, color: { argb: theme.subtitleFg } };

  if (titleRows === 3) {
    ws.mergeCells(3, 1, 3, colCount);
    ws.getCell(3, 1).value = meta.settings.exportFooterNote!.trim();
    ws.getCell(3, 1).font = { italic: true, size: 9, color: { argb: "FF94A3B8" } };
  }

  const headerRowNum = titleRows + 1;
  const dataStartRow = headerRowNum + 1;
  const dataEndRow = dataLines.length > 0 ? dataStartRow + dataLines.length - 1 : headerRowNum;
  let lastRow = dataEndRow;

  if (dataLines.length > 0) {
    const lastCol = excelColumnLetter(colCount - 1);
    try {
      ws.addTable({
        name: sanitizeExcelTableName(sheet.name, sheetIndex),
        ref: `A${headerRowNum}:${lastCol}${dataEndRow}`,
        headerRow: true,
        style: {
          theme: theme.tableTheme,
          showRowStripes: true
        },
        columns: sheet.headers.map((name) => ({ name, filterButton: true })),
        rows: dataLines.map((line) => line.map((v) => v))
      });
    } catch {
      const headerRow = ws.getRow(headerRowNum);
      sheet.headers.forEach((header, index) => {
        headerRow.getCell(index + 1).value = header;
      });
      dataLines.forEach((line, rowOffset) => {
        const row = ws.getRow(dataStartRow + rowOffset);
        line.forEach((value, colOffset) => {
          row.getCell(colOffset + 1).value = value;
        });
      });
      ws.autoFilter = {
        from: { row: headerRowNum, column: 1 },
        to: { row: dataEndRow, column: colCount }
      };
    }

    for (let index = 0; index < sheet.headers.length; index++) {
      const cell = ws.getRow(headerRowNum).getCell(index + 1);
      cell.font = { bold: true, color: { argb: theme.headerFg } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: theme.headerBg } };
      cell.border = { bottom: { style: "thin", color: { argb: theme.headerBg } } };
    }

    dataLines.forEach((line, rowOffset) => {
      line.forEach((value, colOffset) => {
        const key = sheet.columnKeys[colOffset] ?? "";
        const cell = ws.getRow(dataStartRow + rowOffset).getCell(colOffset + 1);
        if (typeof value === "number") {
          applyCellNumberFormat(cell, key, template, meta.settings.currency);
        }
      });
    });
  } else {
    const headerRow = ws.getRow(headerRowNum);
    sheet.headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: theme.headerFg } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: theme.headerBg } };
    });
  }

  if (dataLines.length > 0 && template.supportsTotals && template.summableColumns.length > 0) {
    const totalRowNum = dataEndRow + 1;
    lastRow = totalRowNum;
    const totalRow = ws.getRow(totalRowNum);
    const labelIndex = findTotalLabelColumnIndex(sheet.columnKeys, template);
    if (labelIndex >= 0) {
      totalRow.getCell(labelIndex + 1).value = "Total";
    }

    for (let colOffset = 0; colOffset < sheet.columnKeys.length; colOffset++) {
      const key = sheet.columnKeys[colOffset]!;
      const cell = totalRow.getCell(colOffset + 1);
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: theme.totalBg } };
      cell.border = { top: { style: "thin", color: { argb: "FFCBD5E1" } } };

      if (template.summableColumns.includes(key)) {
        const colLetter = excelColumnLetter(colOffset);
        cell.value = {
          formula: `SUM(${colLetter}${dataStartRow}:${colLetter}${dataEndRow})`
        };
        applyCellNumberFormat(cell, key, template, meta.settings.currency);
      }
    }
  }

  ws.views = [{ state: "frozen", ySplit: headerRowNum, activeCell: `A${dataStartRow}` }];

  sheet.columnKeys.forEach((key, index) => {
    ws.getColumn(index + 1).width = template.columnWidths[key] ?? 14;
  });

  ws.getRow(1).height = 22;
  ws.getRow(headerRowNum).height = 18;
  if (lastRow > dataEndRow) {
    ws.getRow(lastRow).height = 18;
  }
}

export async function buildStyledXlsxBuffer(
  sheets: ExportSheetPayload[],
  meta: XlsxWorkbookMeta
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kloqra";
  workbook.created = new Date();

  sheets.forEach((sheet, index) => {
    writeStyledExportSheet(workbook, sheet, meta, index + 1);
  });

  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
}
