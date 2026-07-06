import { DEFAULT_PROJECT_COLOR } from "@kloqra/contracts";
import type { ProjectDto, TaskDto } from "@kloqra/contracts";

export function contrastTextOn(hex: string): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#0f172a" : "#ffffff";
}

export function entryColorsFromProject(color: string) {
  const base = color || DEFAULT_PROJECT_COLOR;
  return {
    backgroundColor: base,
    borderColor: base,
    color: contrastTextOn(base)
  };
}

export function inactiveEntryColors() {
  return {
    backgroundColor: "hsl(var(--muted))",
    borderColor: "hsl(var(--border))",
    color: "hsl(var(--muted-foreground))"
  };
}

function resolveProjectColor(project: ProjectDto | undefined): string {
  if (!project) return DEFAULT_PROJECT_COLOR;
  return project.myColor ?? project.color ?? DEFAULT_PROJECT_COLOR;
}

export function buildProjectColorByTaskId(tasks: TaskDto[], projects: ProjectDto[]) {
  const byProjectId = new Map(projects.map((p) => [p.id, resolveProjectColor(p)]));
  const map = new Map<string, string>();
  for (const task of tasks) {
    map.set(task.id, byProjectId.get(task.projectId) ?? DEFAULT_PROJECT_COLOR);
  }
  return map;
}

export function colorForTask(taskId: string, tasks: TaskDto[], projects: ProjectDto[]): string {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return DEFAULT_PROJECT_COLOR;
  return colorForProject(task.projectId, projects);
}

export function colorForProject(
  projectId: string,
  projects: ProjectDto[],
  apiColor?: string
): string {
  const project = projects.find((p) => p.id === projectId);
  return project ? resolveProjectColor(project) : (apiColor ?? DEFAULT_PROJECT_COLOR);
}
