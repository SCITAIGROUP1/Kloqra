"use client";

import type { ExportPreviewResponseDto, ExportPreviewSheetDto } from "@kloqra/contracts";
import { cn } from "@kloqra/ui";

function TabChip({ sheet }: { sheet: ExportPreviewSheetDto }) {
  const icon =
    sheet.kind === "person"
      ? "👤"
      : sheet.kind === "project"
        ? "📁"
        : sheet.kind === "client"
          ? "🏢"
          : "📊";

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs",
        sheet.kind === "report"
          ? "border-border bg-muted/50 text-muted-foreground"
          : "border-primary/30 bg-primary/10 text-foreground"
      )}
      title={`${sheet.rowCount.toLocaleString()} rows`}
    >
      <span aria-hidden>{icon}</span>
      <span className="truncate font-medium">{sheet.name}</span>
      <span className="tabular-nums text-muted-foreground">{sheet.rowCount.toLocaleString()}</span>
    </div>
  );
}

type Props = {
  preview: ExportPreviewResponseDto | null;
  loading: boolean;
  error: string | null;
  format: "csv" | "xlsx" | "pdf";
};

export function ExportLayoutPreview({ preview, loading, error, format }: Props) {
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted/70" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 w-24 rounded-md bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!preview) {
    return <p className="text-sm text-muted-foreground">Preview unavailable.</p>;
  }

  if (preview.isEmpty) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{preview.headline}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{preview.detail}</p>
      </div>
    );
  }

  const sheets = preview.sheets ?? [];
  const splitSheets = sheets.filter((s) => s.kind !== "report");
  const summarySheets = sheets.filter((s) => s.kind === "report");

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground leading-snug">{preview.headline}</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{preview.detail}</p>
      </div>

      {sheets.length > 0 ? (
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            What you will get
            {format === "xlsx" ? " (Excel tabs)" : format === "csv" ? " (files in ZIP)" : ""}
          </p>
          {splitSheets.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {splitSheets.map((s) => (
                <TabChip key={`${s.kind}-${s.name}`} sheet={s} />
              ))}
            </div>
          ) : null}
          {summarySheets.length > 0 ? (
            <div className="space-y-1">
              {splitSheets.length > 0 ? (
                <p className="text-[11px] text-muted-foreground">Plus summary tabs</p>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {summarySheets.map((s) => (
                  <TabChip key={s.name} sheet={s} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {format === "pdf" && splitSheets.length > 1 ? (
        <p className="text-[11px] text-muted-foreground">
          PDF lists each section in one document. For separate tabs per person, use Excel.
        </p>
      ) : null}
    </div>
  );
}
