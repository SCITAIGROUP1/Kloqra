export type ExportCellValue = string | number;

export function projectRows(
  rows: Record<string, string | number>[],
  columnKeys: string[],
  labels: Record<string, string>
): { headers: string[]; lines: ExportCellValue[][] } {
  const headers = columnKeys.map((k) => labels[k] ?? k);
  const lines = rows.map((row) =>
    columnKeys.map((k) => {
      const v = row[k];
      if (v === undefined || v === null) return "";
      return typeof v === "number" ? v : String(v);
    })
  );
  return { headers, lines };
}

export function rowsToCsv(headers: string[], lines: ExportCellValue[][]): string {
  const escape = (cell: ExportCellValue) => {
    const text = cell === undefined || cell === null ? "" : String(cell);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  return [headers.map(escape).join(","), ...lines.map((r) => r.map(escape).join(","))].join("\n");
}

export type JsonExportSheet = {
  name: string;
  reportType: string;
  headers: string[];
  lines: ExportCellValue[][];
};

export function rowsToJsonExport(sheets: JsonExportSheet[]): string {
  const payload = {
    reports: sheets.map((sheet) => ({
      name: sheet.name,
      reportType: sheet.reportType,
      columns: sheet.headers,
      rows: sheet.lines.map((line) =>
        Object.fromEntries(sheet.headers.map((header, index) => [header, line[index] ?? ""]))
      )
    }))
  };
  return JSON.stringify(payload, null, 2);
}
