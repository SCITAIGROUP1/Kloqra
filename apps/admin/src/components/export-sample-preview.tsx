"use client";

import type { ExportPreviewSampleRowsDto } from "@kloqra/contracts";
import { cn } from "@kloqra/ui";
import { exportReportLabel } from "@/lib/export-report-labels";

type Props = {
  sampleRows?: ExportPreviewSampleRowsDto[];
};

function formatCell(value: string | number | undefined): string {
  if (value === undefined || value === null || value === "") return "—";
  const text = String(value);
  return text.length > 28 ? `${text.slice(0, 26)}…` : text;
}

function SampleTable({
  sample,
  compact
}: {
  sample: ExportPreviewSampleRowsDto;
  compact?: boolean;
}) {
  const reportLabel = exportReportLabel(sample.reportType);
  const contextLabel = sample.sheetName ? sample.sheetName : reportLabel;
  const columnCount = sample.columns.length;

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">{reportLabel}</p>
          {sample.sheetName && sample.sheetName !== reportLabel ? (
            <p className="truncate text-[10px] text-muted-foreground">{contextLabel}</p>
          ) : null}
        </div>
        <p className="shrink-0 text-[10px] text-muted-foreground">
          {columnCount} col{columnCount === 1 ? "" : "s"} · {sample.rows.length} row
          {sample.rows.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="overflow-hidden rounded-md border border-border/80 bg-background">
        <div className={cn("overflow-x-auto", compact ? "max-h-40" : "max-h-52")}>
          <table className="w-full min-w-max text-[11px]">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
              <tr className="border-b">
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
                      className="max-w-[140px] truncate px-2.5 py-1.5 text-foreground whitespace-nowrap"
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

export function ExportSamplePreview({ sampleRows }: Props) {
  const samples = sampleRows?.filter((sample) => sample.rows.length > 0) ?? [];
  if (samples.length === 0) return null;

  const multi = samples.length > 1;

  return (
    <div className="mt-3 min-w-0 max-w-full space-y-3 border-t border-border/60 pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {multi ? `Sample data · ${samples.length} reports` : "Sample of your data"}
        </p>
      </div>
      <div
        className={cn("min-w-0 space-y-4", multi && "max-h-[min(28rem,55vh)] overflow-y-auto pr-1")}
      >
        {samples.map((sample) => (
          <SampleTable key={sample.reportType} sample={sample} compact={multi} />
        ))}
      </div>
    </div>
  );
}
