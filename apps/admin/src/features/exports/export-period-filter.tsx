"use client";

import type { ExportBodyDto } from "@kloqra/contracts";
import {
  Badge,
  Button,
  DateRangePicker,
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import { CalendarDays } from "lucide-react";
import type { ReactNode } from "react";
import {
  applyDatePreset,
  describeExportPeriodApplied,
  EXPORT_PERIOD_PRESETS,
  matchExportDatePreset,
  type DatePreset
} from "@/lib/export-date-presets";

function FilterFieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

export type ExportPeriodFilterProps = {
  from: string;
  to: string;
  onFromChange: (from: string) => void;
  onToChange: (to: string) => void;
  billable?: ExportBodyDto["billable"];
  onBillableChange?: (billable: ExportBodyDto["billable"]) => void;
  weekStartsOn?: 0 | 1;
  dateRangeAriaLabel?: string;
  previewLoading?: boolean;
  className?: string;
};

export function ExportPeriodFilter({
  from,
  to,
  onFromChange,
  onToChange,
  billable,
  onBillableChange,
  weekStartsOn = 1,
  dateRangeAriaLabel = "Export date range",
  previewLoading = false,
  className
}: ExportPeriodFilterProps) {
  const activePreset = matchExportDatePreset(from, to);
  const showBillable = billable !== undefined && onBillableChange !== undefined;
  const appliedPeriodLabel = describeExportPeriodApplied(from, to);

  function applyPreset(preset: DatePreset) {
    const range = applyDatePreset(preset);
    onFromChange(range.from);
    onToChange(range.to);
  }

  function handleDateRangeChange(nextFrom: string, nextTo: string) {
    onFromChange(nextFrom);
    onToChange(nextTo);
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-3 sm:p-4 transition-colors",
        previewLoading
          ? "border-primary/25 bg-primary/5"
          : "border-primary/35 bg-primary/10 ring-1 ring-primary/15",
        className
      )}
    >
      <div
        className={cn(
          "mb-4 flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
          previewLoading
            ? "border-primary/20 bg-background/70"
            : "border-primary/30 bg-background/90"
        )}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Applied period
            </p>
            <p className="break-words text-sm font-semibold text-foreground">
              {appliedPeriodLabel}
            </p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "w-fit shrink-0 font-normal",
            previewLoading ? "border-primary/20 bg-primary/10" : "border-primary/30 bg-primary/15"
          )}
        >
          {previewLoading ? "Updating preview…" : "Used for export"}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="flex min-w-0 flex-col gap-2">
          <FilterFieldLabel>Quick range</FilterFieldLabel>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {EXPORT_PERIOD_PRESETS.map(({ id, label }) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={activePreset === id ? "secondary" : "outline"}
                className="shrink-0 rounded-full"
                onClick={() => applyPreset(id)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "grid grid-cols-1 gap-4",
            showBillable && "md:grid-cols-[minmax(0,1fr)_auto_minmax(180px,220px)] md:items-end"
          )}
        >
          <div className="flex min-w-0 flex-col gap-2">
            <FilterFieldLabel>Range</FilterFieldLabel>
            <DateRangePicker
              from={from}
              to={to}
              onChange={handleDateRangeChange}
              weekStartsOn={weekStartsOn}
              ariaLabel={dateRangeAriaLabel}
              className="w-full min-w-0"
              numberOfMonths={2}
              collapseToSingleMonthOnMobile={false}
              popoverAlign="start"
            />
          </div>

          {showBillable ? (
            <>
              <div className="hidden w-px self-stretch bg-border/60 md:block" aria-hidden />
              <div className="flex min-w-0 flex-col gap-2">
                <FilterFieldLabel>Billable</FilterFieldLabel>
                <Select
                  value={billable}
                  onValueChange={(v) => onBillableChange(v as ExportBodyDto["billable"])}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All entries</SelectItem>
                    <SelectItem value="billable">Billable only</SelectItem>
                    <SelectItem value="non_billable">Non-billable only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
