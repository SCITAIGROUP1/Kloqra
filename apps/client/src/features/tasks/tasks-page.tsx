"use client";

import { ROUTES } from "@chronomint/contracts";
import type { TaskDto, ProjectDto } from "@chronomint/contracts";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ProjectColorDot,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@chronomint/ui";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { formatProjectLabel } from "@/lib/project-labels";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

const ALL_PROJECTS = "__all__";

export function TasksPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { tasks, projects, workspaceNamesById, setTasks, setProjects } = useProjectsStore();
  const [projectFilter, setProjectFilter] = useState<string>(ALL_PROJECTS);

  useEffect(() => {
    if (!ws) return;
    void api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
    void api<TaskDto[]>(ROUTES.TASKS.LIST, { workspaceId: ws }).then(setTasks);
  }, [ws, setProjects, setTasks]);

  const projectsById = useMemo(() => {
    const m = new Map<string, ProjectDto>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const filteredTasks = useMemo(() => {
    if (projectFilter === ALL_PROJECTS) return tasks;
    return tasks.filter((t) => t.projectId === projectFilter);
  }, [tasks, projectFilter]);

  const grouped = useMemo(() => {
    const groups = new Map<string, TaskDto[]>();
    for (const t of filteredTasks) {
      const key = t.categoryName ?? "Other";
      const list = groups.get(key) ?? [];
      list.push(t);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTasks]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Tasks</h2>
        <p className="text-sm text-muted-foreground">
          Browse the tasks your admin has defined for each project, grouped by category. Tasks are
          managed by admins in the Categories and Projects pages.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle>All tasks</CardTitle>
            <CardDescription>
              {filteredTasks.length} task{filteredTasks.length === 1 ? "" : "s"} across{" "}
              {grouped.length} categor{grouped.length === 1 ? "y" : "ies"}.
            </CardDescription>
          </div>
          <div className="w-[260px]">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROJECTS}>All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <ProjectColorDot color={p.color} />
                      {formatProjectLabel(p, workspaceNamesById)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks for this selection yet.</p>
          ) : (
            <div className="space-y-6">
              {grouped.map(([categoryName, list]) => (
                <div key={categoryName} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{categoryName}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {list.length} task{list.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead className="w-[260px]">Project</TableHead>
                        <TableHead className="w-[140px]">Billable default</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map((t) => {
                        const project = projectsById.get(t.projectId);
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.taskName}</TableCell>
                            <TableCell>
                              {project ? (
                                <span className="flex items-center gap-2 text-sm">
                                  <ProjectColorDot color={project.color} />
                                  {formatProjectLabel(project, workspaceNamesById)}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={t.billableDefault ? "default" : "secondary"}>
                                {t.billableDefault ? "Billable" : "Non-billable"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
