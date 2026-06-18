"use client";

import { ROUTES } from "@kloqra/contracts";
import type { TaskDto, ProjectDto } from "@kloqra/contracts";
import {
  AppBar,
  Badge,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  ProjectColorDot,
  SearchableSelect,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow,
  TableToolbar,
  TableLoadingState
} from "@kloqra/ui";
import { fetchListItems, usePaginatedList } from "@kloqra/web-shared";
import { useEffect, useMemo, useState } from "react";
import { formatProjectLabel } from "@/lib/project-labels";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

const ALL_PROJECTS = "__all__";

export function TasksPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { projects, workspaceNamesById, setProjects } = useProjectsStore();
  const [projectFilter, setProjectFilter] = useState<string>(ALL_PROJECTS);

  useEffect(() => {
    if (!ws) return;
    void fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
  }, [ws, setProjects]);

  const taskFilters = useMemo(
    () => (projectFilter === ALL_PROJECTS ? undefined : { projectId: projectFilter }),
    [projectFilter]
  );

  const {
    items: tasks,
    page,
    setPage,
    search,
    setSearch,
    total,
    totalPages,
    limit,
    setLimit,
    loading
  } = usePaginatedList<TaskDto>({
    workspaceId: ws,
    basePath: ROUTES.TASKS.LIST,
    filters: taskFilters,
    refreshOnFocus: true
  });

  const projectsById = useMemo(() => {
    const m = new Map<string, ProjectDto>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const grouped = useMemo(() => {
    const groups = new Map<string, TaskDto[]>();
    for (const t of tasks) {
      const key = t.categoryName ?? "Other";
      const list = groups.get(key) ?? [];
      list.push(t);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [tasks]);

  return (
    <div className="space-y-6">
      <AppBar
        title="Tasks"
        description="Browse tasks grouped by category. Tasks are managed by admins in Categories and Projects."
      />

      <DataTableCard>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search tasks…"
          searchAriaLabel="Search tasks"
          filters={
            <div className="w-[220px]">
              <SearchableSelect
                value={projectFilter}
                onValueChange={setProjectFilter}
                options={[
                  { value: ALL_PROJECTS, label: "All projects" },
                  ...projects.map((p) => ({
                    value: p.id,
                    label: formatProjectLabel(p, workspaceNamesById)
                  }))
                ]}
                placeholder="Filter by project"
                searchPlaceholder="Search projects…"
                triggerClassName="bg-background"
                aria-label="Filter by project"
              />
            </div>
          }
        />

        {loading ? (
          <TableLoadingState rows={6} columns={3} />
        ) : tasks.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No tasks found for this filter.</p>
        ) : (
          <>
            <div className="space-y-6 p-4 sm:p-6">
              {grouped.map(([categoryName, categoryTasks]) => (
                <div key={categoryName} className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">{categoryName}</h3>
                  <Table>
                    <TableHeader>
                      <DataTableHeaderRow>
                        <DataTableHead>Task</DataTableHead>
                        <DataTableHead>Project</DataTableHead>
                        <DataTableHead>Billable default</DataTableHead>
                      </DataTableHeaderRow>
                    </TableHeader>
                    <TableBody>
                      {categoryTasks.map((t) => {
                        const project = projectsById.get(t.projectId);
                        return (
                          <TableRow key={t.id}>
                            <DataTableCell className="font-medium">{t.taskName}</DataTableCell>
                            <DataTableCell>
                              {project ? (
                                <span className="inline-flex items-center gap-2">
                                  <ProjectColorDot color={project.color} size="sm" />
                                  {project.name}
                                </span>
                              ) : (
                                "—"
                              )}
                            </DataTableCell>
                            <DataTableCell>
                              <Badge variant={t.billableDefault ? "default" : "secondary"}>
                                {t.billableDefault ? "Billable" : "Non-billable"}
                              </Badge>
                            </DataTableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
              disabled={loading}
            />
          </>
        )}
      </DataTableCard>
    </div>
  );
}
