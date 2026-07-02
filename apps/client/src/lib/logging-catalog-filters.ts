import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";

export function filterLoggingProjects(projects: ProjectDto[]): ProjectDto[] {
  return projects.filter((project) => project.isActive);
}

export function filterLoggingTasks(
  tasks: TaskDto[],
  projects: ProjectDto[],
  categories: CategoryDto[]
): TaskDto[] {
  const activeProjectIds = new Set(filterLoggingProjects(projects).map((project) => project.id));
  const activeCategoryIds = new Set(
    categories.filter((category) => category.isActive).map((category) => category.id)
  );

  return tasks.filter(
    (task) =>
      task.isActive &&
      activeProjectIds.has(task.projectId) &&
      activeCategoryIds.has(task.categoryId)
  );
}
