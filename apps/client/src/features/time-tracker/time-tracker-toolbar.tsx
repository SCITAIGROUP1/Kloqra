"use client";

import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import {
  Badge,
  Button,
  Input,
  ProjectColorDot,
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
  type TimeTrackerPeriodPreset
} from "./time-tracker-period";
import { formatProjectLabel } from "@/lib/project-labels";

type TimeTrackerToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  projectId: string;
  onProjectChange: (value: string) => void;
  period: TimeTrackerPeriodPreset;
  onPeriodChange: (value: TimeTrackerPeriodPreset) => void;
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
};

export function TimeTrackerToolbar({
  search,
  onSearchChange,
  projectId,
  onProjectChange,
  period,
  onPeriodChange,
  projects,
  categories,
  tasks,
  workspaceNamesById,
  filterValues,
  onCategoryChange,
  onTaskChange,
  onBillabilityChange,
  onClearFilters,
  onAddEntry
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
          <Select
            value={projectId}
            onValueChange={(v) => {
              onProjectChange(v);
              onTaskChange("");
            }}
          >
            <SelectTrigger className="w-[180px]" aria-label="Filter by project">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <span className="flex items-center gap-2">
                    <ProjectColorDot color={project.color} size="sm" />
                    {formatProjectLabel(project, workspaceNamesById)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={period}
            onValueChange={(v) => onPeriodChange(v as TimeTrackerPeriodPreset)}
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
            </SelectContent>
          </Select>
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
        <Button type="button" className="gap-1.5 shrink-0" onClick={onAddEntry}>
          <Plus className="size-4" />
          Add Entry
        </Button>
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
