"use client";

import type {
  ExportPreviewResponseDto,
  ExportPreviewSheetDto,
  ExportReportType
} from "@kloqra/contracts";
import { cn } from "@kloqra/ui";
import { exportReportLabel } from "@/lib/export-report-labels";

const MAX_VISIBLE_CHIPS = 6;

function kindLabel(kind: ExportPreviewSheetDto["kind"]): string {
  switch (kind) {
    case "person":
      return "Person";
    case "project":
      return "Project";
    case "client":
      return "Client";
    case "category":
      return "Category";
    default:
      return "Summary";
  }
}

function SectionChip({ sheet }: { sheet: ExportPreviewSheetDto }) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
        sheet.kind === "report"
          ? "border-border bg-background text-muted-foreground"
          : "border-primary/25 bg-primary/5 text-foreground"
      )}
      title={`${sheet.rowCount.toLocaleString()} rows`}
    >
      <span className="truncate font-medium">{sheet.name}</span>
      <span className="shrink-0 tabular-nums text-muted-foreground">
        {sheet.rowCount.toLocaleString()}
      </span>
    </div>
  );
}

type Props = {
  preview: ExportPreviewResponseDto | null;
  loading: boolean;
  error: string | null;
  format: "csv" | "xlsx" | "pdf" | "json";
  organizeDescription?: string;
  selectedReportTypes?: ExportReportType[];
};

export function ExportLayoutPreview({
  preview,
  loading,
  error,
  format,
  organizeDescription,
  selectedReportTypes = []
}: Props) {
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse py-1">
        <div className="h-5 w-2/3 rounded-md bg-muted" />
        <div className="h-3 w-full rounded bg-muted/60" />
        <div className="flex flex-wrap gap-2 pt-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 w-20 rounded-full bg-muted/80" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Could not load preview. Check your connection and try again.
      </p>
    );
  }

  if (!preview) {
    return (
      <p className="text-sm text-muted-foreground">
        Choose a report type and date range to see a preview.
      </p>
    );
  }

  if (preview.isEmpty) {
    return (
      <div className="space-y-2 py-1">
        <p className="text-sm font-medium text-foreground">Nothing to export yet</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          No time was logged in this period. Try a wider date range or remove filters.
        </p>
      </div>
    );
  }

  const sheets = [...(preview.sheets ?? [])];
  const splitSheets = sheets
    .filter((s) => s.kind !== "report")
    .sort((a, b) => a.name.localeCompare(b.name));
  const summarySheets = sheets.filter((s) => s.kind === "report");
  const peopleCount = splitSheets.filter((s) => s.kind === "person").length;
  const visibleSplit = splitSheets.slice(0, MAX_VISIBLE_CHIPS);
  const hiddenSplit = splitSheets.length - visibleSplit.length;

  const statParts: string[] = [];
  if (peopleCount > 0) {
    statParts.push(`${peopleCount} ${peopleCount === 1 ? "person" : "people"}`);
  }
  if (preview.totalLogRows > 0) {
    statParts.push(`${preview.totalLogRows.toLocaleString()} entries`);
  }
  if (preview.estimatedRowCount && preview.estimatedRowCount !== preview.totalLogRows) {
    statParts.push(`${preview.estimatedRowCount.toLocaleString()} total rows`);
  }

  const includedReports = selectedReportTypes.map((reportType) => ({
    reportType,
    label: exportReportLabel(reportType),
    count: preview.counts?.[reportType] ?? 0
  }));

  return (
    <div className="space-y-3 py-0.5">
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-foreground leading-snug">{preview.headline}</p>
        {statParts.length > 0 ? (
          <p className="text-xs font-medium text-primary">{statParts.join(" · ")}</p>
        ) : null}
        {organizeDescription ? (
          <p className="text-xs text-muted-foreground leading-relaxed">{organizeDescription}</p>
        ) : (
          <p className="text-xs text-muted-foreground leading-relaxed">{preview.detail}</p>
        )}
      </div>

      {includedReports.length > 1 ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">
            Included reports ({includedReports.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {includedReports.map((entry) => (
              <div
                key={entry.reportType}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs"
                title={`${entry.count.toLocaleString()} rows`}
              >
                <span className="truncate font-medium">{entry.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {entry.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {sheets.length > 0 ? (
        <div className="space-y-2">
          {visibleSplit.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                {splitSheets[0] ? `${kindLabel(splitSheets[0].kind)} sections` : "Sections"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {visibleSplit.map((s) => (
                  <SectionChip key={`${s.kind}-${s.name}`} sheet={s} />
                ))}
                {hiddenSplit > 0 ? (
                  <span className="inline-flex items-center rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground">
                    +{hiddenSplit} more
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
          {summarySheets.length > 0 ? (
            <div>
              {splitSheets.length > 0 ? (
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                  Summary tables
                </p>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {summarySheets.map((s) => (
                  <SectionChip key={s.name} sheet={s} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {format === "pdf" && splitSheets.length > 1 ? (
        <p className="text-[11px] text-muted-foreground">
          PDF combines all sections in one document. Use Excel for separate sheets per person.
        </p>
      ) : null}
      {format === "csv" && summarySheets.length > 1 ? (
        <p className="text-[11px] text-muted-foreground">
          CSV downloads as a ZIP with one file per section.
        </p>
      ) : null}
    </div>
  );
}
