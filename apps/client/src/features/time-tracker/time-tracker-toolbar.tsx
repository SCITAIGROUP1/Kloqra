"use client";

import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import {
  Badge,
  Button,
  DateRangePicker,
  Input,
  ProjectColorDot,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import { ChevronDown, Filter, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  TimeTrackerFiltersPanel,
  type TimeTrackerFilterValues
} from "./time-tracker-filters-panel";
import {
  TIME_TRACKER_PERIOD_LABELS,
  TIME_TRACKER_PERIOD_PRESETS,
  type TimeTrackerPeriodSelection
} from "./time-tracker-period";
import { formatProjectLabel } from "@/lib/project-labels";

type TimeTrackerToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  projectId: string;
  onProjectChange: (value: string) => void;
  period: TimeTrackerPeriodSelection;
  onPeriodChange: (value: TimeTrackerPeriodSelection) => void;
  rangeFrom: string;
  rangeTo: string;
  onRangeChange: (from: string, to: string) => void;
  weekStartsOn?: 0 | 1;
  projects: ProjectDto[];
  categories: CategoryDto[];
  tasks: TaskDto[];
  workspaceNamesById: Record<string, string>;
  filterValues: TimeTrackerFilterValues;
  onCategoryChange: (value: string) => void;
  onTaskChange: (value: string) => void;
  onBillabilityChange: (value: TimeTrackerFilterValues["billability"]) => void;
  onClearFilters: () => void;
  onAddEntry: () => void;
  readOnly?: boolean;
};

export function TimeTrackerToolbar({
  search,
  onSearchChange,
  projectId,
  onProjectChange,
  period,
  onPeriodChange,
  rangeFrom,
  rangeTo,
  onRangeChange,
  weekStartsOn = 1,
  projects,
  categories,
  tasks,
  workspaceNamesById,
  filterValues,
  onCategoryChange,
  onTaskChange,
  onBillabilityChange,
  onClearFilters,
  onAddEntry,
  readOnly = false
}: TimeTrackerToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterValues.billability !== "all") count += 1;
    if (filterValues.categoryId) count += 1;
    if (filterValues.taskId) count += 1;
    return count;
  }, [filterValues]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search entries..."
              className="pl-9"
              aria-label="Search entries"
            />
          </div>
          <SearchableSelect
            value={projectId}
            onValueChange={(v) => {
              onProjectChange(v);
              onTaskChange("");
            }}
            options={[
              { value: "all", label: "All Projects" },
              ...projects.map((project) => ({
                value: project.id,
                label: formatProjectLabel(project, workspaceNamesById)
              }))
            ]}
            placeholder="All Projects"
            searchPlaceholder="Search projects…"
            className="w-[180px]"
            aria-label="Filter by project"
            renderOption={(option) =>
              option.value === "all" ? (
                option.label
              ) : (
                <span className="flex items-center gap-2">
                  <ProjectColorDot
                    color={
                      projects.find((project) => project.id === option.value)?.color ?? "#236bfe"
                    }
                    size="sm"
                  />
                  {option.label}
                </span>
              )
            }
            renderValue={(option) =>
              option && option.value !== "all" ? (
                <span className="flex items-center gap-2">
                  <ProjectColorDot
                    color={
                      projects.find((project) => project.id === option.value)?.color ?? "#236bfe"
                    }
                    size="sm"
                  />
                  {option.label}
                </span>
              ) : (
                (option?.label ?? "All Projects")
              )
            }
          />
          <Select
            value={period}
            onValueChange={(v) => onPeriodChange(v as TimeTrackerPeriodSelection)}
          >
            <SelectTrigger className="w-[172px]" aria-label="Time period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_TRACKER_PERIOD_PRESETS.map((preset) => (
                <SelectItem key={preset} value={preset}>
                  {TIME_TRACKER_PERIOD_LABELS[preset]}
                </SelectItem>
              ))}
              <SelectItem value="custom">{TIME_TRACKER_PERIOD_LABELS.custom}</SelectItem>
            </SelectContent>
          </Select>
          <DateRangePicker
            from={rangeFrom}
            to={rangeTo}
            onChange={onRangeChange}
            weekStartsOn={weekStartsOn}
            ariaLabel="Date range"
            className="w-full min-w-[200px] sm:w-[260px]"
            numberOfMonths={2}
            popoverAlign="end"
          />
          <Button
            type="button"
            variant={filtersOpen || activeFilterCount > 0 ? "secondary" : "outline"}
            size="sm"
            className="gap-1.5"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <Filter className="size-4" />
            Filters
            {activeFilterCount > 0 ? (
              <Badge variant="default" className="ml-0.5 h-5 min-w-5 px-1.5 text-[10px]">
                {activeFilterCount}
              </Badge>
            ) : null}
            <ChevronDown
              className={`size-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
            />
          </Button>
        </div>
        {!readOnly && (
          <Button type="button" className="gap-1.5 shrink-0" onClick={onAddEntry}>
            <Plus className="size-4" />
            Add Entry
          </Button>
        )}
      </div>

      {filtersOpen ? (
        <TimeTrackerFiltersPanel
          values={filterValues}
          categories={categories}
          tasks={tasks}
          projectId={projectId}
          onCategoryChange={onCategoryChange}
          onTaskChange={onTaskChange}
          onBillabilityChange={onBillabilityChange}
          onClear={onClearFilters}
        />
      ) : null}
    </div>
  );
}
