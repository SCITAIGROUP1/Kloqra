"use client";

import type { TimesheetApprovalsFilterQuery } from "@kloqra/contracts";
import {
  Button,
  DateRangePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
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
          <Select
            value={filters.projectId ?? "all"}
            onValueChange={(value) =>
              onChange({ ...filters, projectId: value === "all" ? undefined : value })
            }
            disabled={loading}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projectOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <FilterFieldLabel>Member</FilterFieldLabel>
          <Select
            value={filters.userId ?? "all"}
            onValueChange={(value) =>
              onChange({ ...filters, userId: value === "all" ? undefined : value })
            }
            disabled={loading}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="All members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All members</SelectItem>
              {memberOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
