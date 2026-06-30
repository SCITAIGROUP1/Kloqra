"use client";

import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import {
  Badge,
  Button,
  Label,
  ProjectColorDot,
  SearchableMultiSelect,
  SearchableSelect,
  cn
} from "@kloqra/ui";
import { ChevronDown, Filter, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ExportAppliedScopeSummary } from "./export-applied-scope-summary";

export type ScopeMember = { userId: string; userName: string };

type ExportScopeFiltersProps = {
  projectIds: string[];
  userIds: string[];
  onProjectIdsChange: (ids: string[]) => void;
  onUserIdsChange: (ids: string[]) => void;
  projects: ProjectDto[];
  members: ScopeMember[];
  categories: CategoryDto[];
  tasks: TaskDto[];
  categoryId: string;
  taskId: string;
  onCategoryChange: (categoryId: string) => void;
  onTaskChange: (taskId: string) => void;
  teamOnly: boolean;
  onTeamOnlyChange: (teamOnly: boolean) => void;
  onClearAll: () => void;
  onResetFilters?: () => void;
  previewLoading?: boolean;
  className?: string;
};

function activeFilterCount(props: ExportScopeFiltersProps): number {
  let count = 0;
  if (props.projectIds.length) count += 1;
  if (props.userIds.length) count += 1;
  if (props.categoryId) count += 1;
  if (props.taskId) count += 1;
  if (props.teamOnly) count += 1;
  return count;
}

export function ExportScopeFilters({
  projectIds,
  userIds,
  onProjectIdsChange,
  onUserIdsChange,
  projects,
  members,
  categories,
  tasks,
  categoryId,
  taskId,
  onCategoryChange,
  onTaskChange,
  teamOnly,
  onTeamOnlyChange,
  onClearAll,
  onResetFilters,
  previewLoading = false,
  className
}: ExportScopeFiltersProps) {
  const activeCount = activeFilterCount({
    projectIds,
    userIds,
    onProjectIdsChange,
    onUserIdsChange,
    projects,
    members,
    categories,
    tasks,
    categoryId,
    taskId,
    onCategoryChange,
    onTaskChange,
    teamOnly,
    onTeamOnlyChange,
    onClearAll
  });
  const [open, setOpen] = useState(activeCount > 0);
  const [moreOpen, setMoreOpen] = useState(
    Boolean(categoryId || taskId || (projectIds.length === 1 && teamOnly))
  );

  useEffect(() => {
    if (activeCount > 0) setOpen(true);
  }, [activeCount]);

  const projectOptions = useMemo(
    () => projects.map((p) => ({ value: p.id, label: p.name, color: p.color })),
    [projects]
  );

  const memberOptions = useMemo(
    () => members.map((m) => ({ value: m.userId, label: m.userName })),
    [members]
  );

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  const taskOptions = useMemo(
    () => tasks.map((t) => ({ value: t.id, label: t.taskName })),
    [tasks]
  );

  const taskDisabled = projectIds.length === 0;
  const categoryName = categoryId ? categories.find((c) => c.id === categoryId)?.name : undefined;
  const taskName = taskId ? tasks.find((t) => t.id === taskId)?.taskName : undefined;
  const chips = useMemo(() => {
    const out: { key: string; label: string; onClear: () => void }[] = [];
    if (projectIds.length === 1) {
      const p = projects.find((x) => x.id === projectIds[0]);
      out.push({
        key: "project",
        label: p ? `Project: ${p.name}` : "1 project",
        onClear: () => onProjectIdsChange([])
      });
    } else if (projectIds.length > 1) {
      out.push({
        key: "projects",
        label: `${projectIds.length} projects`,
        onClear: () => onProjectIdsChange([])
      });
    }
    if (userIds.length === 1) {
      const m = members.find((x) => x.userId === userIds[0]);
      out.push({
        key: "user",
        label: m ? `Person: ${m.userName}` : "1 person",
        onClear: () => onUserIdsChange([])
      });
    } else if (userIds.length > 1) {
      out.push({
        key: "users",
        label: `${userIds.length} people`,
        onClear: () => onUserIdsChange([])
      });
    }
    if (categoryId) {
      const c = categories.find((x) => x.id === categoryId);
      out.push({
        key: "category",
        label: c ? `Category: ${c.name}` : "Category",
        onClear: () => onCategoryChange("")
      });
    }
    if (taskId) {
      const t = tasks.find((x) => x.id === taskId);
      out.push({
        key: "task",
        label: t ? `Task: ${t.taskName}` : "Task",
        onClear: () => onTaskChange("")
      });
    }
    if (teamOnly && projectIds.length > 0) {
      out.push({
        key: "team",
        label: "Project team only",
        onClear: () => onTeamOnlyChange(false)
      });
    }
    return out;
  }, [
    projectIds,
    userIds,
    categoryId,
    taskId,
    teamOnly,
    projects,
    members,
    categories,
    tasks,
    onProjectIdsChange,
    onUserIdsChange,
    onCategoryChange,
    onTaskChange,
    onTeamOnlyChange
  ]);

  return (
    <div className={cn("space-y-3", className)}>
      <ExportAppliedScopeSummary
        projectIds={projectIds}
        userIds={userIds}
        projects={projects}
        members={members}
        categoryName={categoryName}
        taskName={taskName}
        teamOnly={teamOnly}
        previewLoading={previewLoading}
      />

      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-left text-sm hover:bg-muted/40"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2 font-medium">
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
          Scope filters
          {activeCount > 0 ? (
            <Badge variant="secondary" className="font-normal">
              {activeCount}
            </Badge>
          ) : null}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="space-y-4 rounded-lg border border-border bg-muted/10 p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Leave projects and people empty to include everyone. Select one or more to narrow the
            export.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Projects</Label>
              <SearchableMultiSelect
                value={projectIds}
                onChange={onProjectIdsChange}
                options={projectOptions}
                placeholder="All projects"
                searchPlaceholder="Search projects…"
                selectAllLabel="All projects"
                renderOption={(option) => (
                  <span className="flex items-center gap-2">
                    {"color" in option && option.color ? (
                      <ProjectColorDot color={option.color as string} />
                    ) : null}
                    {option.label}
                  </span>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>People</Label>
              <SearchableMultiSelect
                value={userIds}
                onChange={onUserIdsChange}
                options={memberOptions}
                placeholder="All team members"
                searchPlaceholder="Search people…"
                selectAllLabel="All members"
              />
            </div>
          </div>

          <div>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => setMoreOpen((v) => !v)}
            >
              {moreOpen ? "Hide more filters" : "More filters"}
            </button>
          </div>

          {moreOpen ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <SearchableSelect
                  value={categoryId || "__all__"}
                  onValueChange={(v) => onCategoryChange(v === "__all__" ? "" : v)}
                  options={[{ value: "__all__", label: "All categories" }, ...categoryOptions]}
                  placeholder="All categories"
                  searchPlaceholder="Search categories…"
                />
              </div>
              <div className="space-y-2">
                <Label>Task</Label>
                <SearchableSelect
                  value={taskId || "__all__"}
                  onValueChange={(v) => onTaskChange(v === "__all__" ? "" : v)}
                  options={[{ value: "__all__", label: "All tasks" }, ...taskOptions]}
                  placeholder={taskDisabled ? "Select a project first" : "All tasks"}
                  searchPlaceholder="Search tasks…"
                  disabled={taskDisabled}
                />
                {taskDisabled && projectIds.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    Task filter is available when at least one project is selected.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {projectIds.length > 0 ? (
            <label className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={teamOnly}
                onChange={(e) => onTeamOnlyChange(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Only include project team members
            </label>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border/40 pt-3 mt-4">
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <Badge key={chip.key} variant="secondary" className="gap-1 pr-1 font-normal">
                  {chip.label}
                  <button
                    type="button"
                    className="rounded-sm p-0.5 hover:bg-muted"
                    aria-label={`Remove ${chip.label}`}
                    onClick={chip.onClear}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {chips.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={onClearAll}
                >
                  Clear all
                </Button>
              )}
              {onResetFilters && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold"
                  onClick={onResetFilters}
                >
                  Reset Filters
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
