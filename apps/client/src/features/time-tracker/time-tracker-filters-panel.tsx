"use client";

import type { CategoryDto, TaskDto } from "@kloqra/contracts";
import {
  Button,
  Label,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import { useMemo } from "react";

export type BillabilityFilter = "all" | "billable";

export type TimeTrackerFilterValues = {
  categoryId: string;
  taskId: string;
  billability: BillabilityFilter;
};

type TimeTrackerFiltersPanelProps = {
  values: TimeTrackerFilterValues;
  categories: CategoryDto[];
  tasks: TaskDto[];
  projectId: string;
  onCategoryChange: (categoryId: string) => void;
  onTaskChange: (taskId: string) => void;
  onBillabilityChange: (value: BillabilityFilter) => void;
  onClear: () => void;
};

export function TimeTrackerFiltersPanel({
  values,
  categories,
  tasks,
  projectId,
  onCategoryChange,
  onTaskChange,
  onBillabilityChange,
  onClear
}: TimeTrackerFiltersPanelProps) {
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (projectId !== "all" && task.projectId !== projectId) return false;
      if (values.categoryId && task.categoryId !== values.categoryId) return false;
      return true;
    });
  }, [tasks, projectId, values.categoryId]);

  const hasActiveFilters =
    values.billability !== "all" || Boolean(values.categoryId) || Boolean(values.taskId);

  return (
    <div className="rounded-lg border border-border bg-muted/20">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="text-sm font-medium">Refine results</p>
        {hasActiveFilters ? (
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onClear}>
            Clear all
          </Button>
        ) : null}
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="time-tracker-category" className="text-xs text-muted-foreground">
            Category
          </Label>
          <SearchableSelect
            id="time-tracker-category"
            value={values.categoryId || "all"}
            onValueChange={(v) => {
              onCategoryChange(v === "all" ? "" : v);
              onTaskChange("");
            }}
            options={[
              { value: "all", label: "All categories" },
              ...categories.map((category) => ({ value: category.id, label: category.name }))
            ]}
            placeholder="All categories"
            searchPlaceholder="Search categories…"
            triggerClassName="bg-background"
            aria-label="Category"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time-tracker-task" className="text-xs text-muted-foreground">
            Task
          </Label>
          <SearchableSelect
            id="time-tracker-task"
            value={values.taskId || "all"}
            onValueChange={(v) => onTaskChange(v === "all" ? "" : v)}
            options={[
              { value: "all", label: "All tasks" },
              ...filteredTasks.map((task) => ({ value: task.id, label: task.taskName }))
            ]}
            placeholder="All tasks"
            searchPlaceholder="Search tasks…"
            triggerClassName="bg-background"
            aria-label="Task"
          />
        </div>
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="time-tracker-billability" className="text-xs text-muted-foreground">
            Billability
          </Label>
          <Select
            value={values.billability}
            onValueChange={(v) => onBillabilityChange(v as BillabilityFilter)}
          >
            <SelectTrigger id="time-tracker-billability" className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entries</SelectItem>
              <SelectItem value="billable">Billable only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
