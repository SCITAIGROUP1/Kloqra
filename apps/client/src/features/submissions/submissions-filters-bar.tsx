"use client";

import {
  Button,
  DateRangePicker,
  SearchableMultiSelect,
  type SearchableMultiSelectOption
} from "@kloqra/ui";

export type SubmissionsFiltersBarProps = {
  rangeFrom: string;
  rangeTo: string;
  onRangeChange: (from: string, to: string) => void;
  weekStartsOn?: 0 | 1;
  projectFilter: string[];
  onProjectFilterChange: (value: string[]) => void;
  projectOptions: SearchableMultiSelectOption[];
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  resultCount?: number;
};

function FilterFieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

export function SubmissionsFiltersBar({
  rangeFrom,
  rangeTo,
  onRangeChange,
  weekStartsOn = 1,
  projectFilter,
  onProjectFilterChange,
  projectOptions,
  onClearFilters,
  hasActiveFilters,
  resultCount
}: SubmissionsFiltersBarProps) {
  const hasRange = rangeFrom.length > 0 || rangeTo.length > 0;

  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4 space-y-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <FilterFieldLabel>Period</FilterFieldLabel>
          <DateRangePicker
            from={rangeFrom}
            to={rangeTo}
            onChange={onRangeChange}
            weekStartsOn={weekStartsOn}
            ariaLabel="Filter by period start date"
            className="w-full"
            numberOfMonths={2}
            popoverAlign="end"
            collapseToSingleMonthOnMobile={false}
          />
          {!hasRange ? (
            <p className="text-xs text-muted-foreground">Showing last 26 weeks</p>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <FilterFieldLabel>Project</FilterFieldLabel>
          <SearchableMultiSelect
            value={projectFilter}
            onChange={onProjectFilterChange}
            options={projectOptions}
            placeholder="All projects"
            searchPlaceholder="Search projects…"
            selectAllLabel="All projects"
            aria-label="Project"
            triggerClassName="bg-background h-10 w-full font-normal"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/40 pt-3">
        <p className="text-xs text-muted-foreground">
          {typeof resultCount === "number"
            ? `${resultCount} submission${resultCount === 1 ? "" : "s"}`
            : "Filter by period or project"}
        </p>
        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={onClearFilters}
          >
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
