"use client";

import type { TimesheetApprovalsFilterQuery } from "@kloqra/contracts";
import { Button, DateRangePicker, SearchableMultiSelect } from "@kloqra/ui";
import { hasActiveApprovalsFilter } from "@kloqra/web-shared";
import type { ApprovalsFilterOption } from "./use-approvals-filter-options";

export type ApprovalsFiltersBarProps = {
  filters: TimesheetApprovalsFilterQuery;
  onChange: (next: TimesheetApprovalsFilterQuery) => void;
  onClear: () => void;
  projectOptions: ApprovalsFilterOption[];
  memberOptions: ApprovalsFilterOption[];
  loading?: boolean;
  resultCount?: number;
};

function FilterFieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

export function ApprovalsFiltersBar({
  filters,
  onChange,
  onClear,
  projectOptions,
  memberOptions,
  loading = false,
  resultCount
}: ApprovalsFiltersBarProps) {
  const active = hasActiveApprovalsFilter(filters);

  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4 space-y-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-2">
          <FilterFieldLabel>Project</FilterFieldLabel>
          <SearchableMultiSelect
            value={filters.projectId ?? []}
            onChange={(value) =>
              onChange({ ...filters, projectId: value.length > 0 ? value : undefined })
            }
            options={projectOptions.map((option) => ({ value: option.value, label: option.label }))}
            placeholder="All projects"
            searchPlaceholder="Search projects…"
            selectAllLabel="All projects"
            disabled={loading}
            aria-label="Project"
            triggerClassName="bg-background h-10 w-full font-normal"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <FilterFieldLabel>Member</FilterFieldLabel>
          <SearchableMultiSelect
            value={filters.userId ?? []}
            onChange={(value) =>
              onChange({ ...filters, userId: value.length > 0 ? value : undefined })
            }
            options={memberOptions.map((option) => ({ value: option.value, label: option.label }))}
            placeholder="All members"
            searchPlaceholder="Search members…"
            selectAllLabel="All members"
            disabled={loading}
            aria-label="Member"
            triggerClassName="bg-background h-10 w-full font-normal"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <FilterFieldLabel>Period range</FilterFieldLabel>
          <DateRangePicker
            from={filters.from ?? ""}
            to={filters.to ?? ""}
            onChange={(from, to) =>
              onChange({ ...filters, from: from || undefined, to: to || undefined })
            }
            weekStartsOn={1}
            ariaLabel="Filter by period start date"
            className="w-full"
            numberOfMonths={2}
            popoverAlign="end"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {typeof resultCount === "number"
            ? `${resultCount} result${resultCount === 1 ? "" : "s"}`
            : "Filter by project, member, or period start date"}
        </p>
        {active ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear}>
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
