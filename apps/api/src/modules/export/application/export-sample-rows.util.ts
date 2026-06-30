import type { ExportPreviewSampleRowsDto, ExportReportType } from "@kloqra/contracts";
import type { ExportCellValue } from "./export-render.util";

export type ExportSampleSheet = {
  name: string;
  report: ExportReportType;
  headers: string[];
  lines: ExportCellValue[][];
};

function sheetToSample(
  sheet: ExportSampleSheet,
  maxRows: number
): ExportPreviewSampleRowsDto | null {
  if (sheet.headers.length === 0) return null;

  const rows = sheet.lines.slice(0, maxRows).map((line) => {
    const out: Record<string, string | number> = {};
    sheet.headers.forEach((header, index) => {
      const val = line[index];
      out[header] =
        val === undefined || val === null ? "" : typeof val === "number" ? val : String(val);
    });
    return out;
  });

  if (rows.length === 0) return null;

  return {
    reportType: sheet.report,
    sheetName: sheet.name,
    columns: [...sheet.headers],
    rows
  };
}

function pickSheetForReport(
  sheets: ExportSampleSheet[],
  reportType: ExportReportType
): ExportSampleSheet | undefined {
  return (
    sheets.find((sheet) => sheet.report === reportType && sheet.lines.length > 0) ??
    sheets.find((sheet) => sheet.report === reportType)
  );
}

/** Build sample rows from the same projected sheet lines used for download. */
export function buildExportPreviewSampleRows(
  sheets: ExportSampleSheet[],
  options?: {
    focusReport?: ExportReportType;
    reportTypes?: ExportReportType[];
    maxRows?: number;
    maxSamples?: number;
  }
): ExportPreviewSampleRowsDto[] {
  const maxRows = options?.maxRows ?? 5;
  const maxSamples = options?.maxSamples ?? 8;
  if (sheets.length === 0) return [];

  if (options?.focusReport) {
    const sheet = pickSheetForReport(sheets, options.focusReport);
    if (!sheet) return [];
    const sample = sheetToSample(sheet, maxRows);
    return sample ? [sample] : [];
  }

  if (options?.reportTypes?.length) {
    const samples: ExportPreviewSampleRowsDto[] = [];
    for (const reportType of options.reportTypes.slice(0, maxSamples)) {
      const sheet = pickSheetForReport(sheets, reportType);
      if (!sheet) continue;
      const sample = sheetToSample(sheet, maxRows);
      if (sample) samples.push(sample);
    }
    return samples;
  }

  const sheet = sheets.find((candidate) => candidate.lines.length > 0) ?? sheets[0];
  if (!sheet) return [];
  const sample = sheetToSample(sheet, maxRows);
  return sample ? [sample] : [];
}
