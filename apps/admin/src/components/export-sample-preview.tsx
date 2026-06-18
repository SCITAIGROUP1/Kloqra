"use client";

import type { ExportPreviewSampleRowsDto } from "@kloqra/contracts";

type Props = {
  sampleRows?: ExportPreviewSampleRowsDto[];
};

function formatCell(value: string | number | undefined): string {
  if (value === undefined || value === null || value === "") return "—";
  const text = String(value);
  return text.length > 28 ? `${text.slice(0, 26)}…` : text;
}

export function ExportSamplePreview({ sampleRows }: Props) {
  const sample = sampleRows?.[0];
  if (!sample || sample.rows.length === 0) return null;

  const contextLabel = sample.sheetName ? `From “${sample.sheetName}”` : "Sample of your data";
  const columnCount = sample.columns.length;

  return (
    <div className="mt-3 min-w-0 max-w-full space-y-2 border-t border-border/60 pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">{contextLabel}</p>
        <p className="text-[10px] text-muted-foreground text-right">
          {columnCount} col{columnCount === 1 ? "" : "s"} · first {sample.rows.length} row
          {sample.rows.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="overflow-hidden rounded-md border border-border/80 bg-background">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-[11px]">
            <thead>
              <tr className="border-b bg-muted/30">
                {sample.columns.map((col) => (
                  <th
                    key={col}
                    className="px-2.5 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sample.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-background" : "bg-muted/15"}>
                  {sample.columns.map((col) => (
                    <td
                      key={col}
                      className="px-2.5 py-1.5 text-foreground whitespace-nowrap max-w-[160px] truncate"
                      title={String(row[col] ?? "")}
                    >
                      {formatCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
