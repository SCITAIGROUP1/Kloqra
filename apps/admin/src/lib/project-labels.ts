import type { ProjectDto } from "@kloqra/contracts";

type ProjectLike = Pick<ProjectDto, "name" | "color" | "workspaceName" | "workspaceId">;

export function formatProjectLabel(
  project: ProjectLike,
  workspaceNames?: Record<string, string>
): string {
  const workspace = project.workspaceName ?? workspaceNames?.[project.workspaceId];
  return workspace ? `${workspace} · ${project.name}` : project.name;
}

export function formatTaskLabel(
  project: ProjectLike | undefined,
  taskName: string,
  workspaceNames?: Record<string, string>
): string {
  if (!project) return taskName;
  return `${formatProjectLabel(project, workspaceNames)} · ${taskName}`;
}
