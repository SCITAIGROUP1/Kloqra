import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";

export const LOGGING_PROJECT_FILTERS = { isActive: true } as const;
export const LOGGING_TASK_FILTERS = { loggableOnly: true } as const;

export function filterLoggingProjects(projects: ProjectDto[]): ProjectDto[] {
  return projects.filter((project) => project.isActive);
}

export function isLoggableTask(
  task: TaskDto,
  projectById: Map<string, ProjectDto>,
  categoryById: Map<string, CategoryDto>
): boolean {
  if (!task.isActive) return false;
  const project = projectById.get(task.projectId);
  if (!project?.isActive) return false;
  const category = categoryById.get(task.categoryId);
  if (category && !category.isActive) return false;
  return true;
}

export function filterLoggingTasks(
  tasks: TaskDto[],
  projects: ProjectDto[],
  categories: CategoryDto[]
): TaskDto[] {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  return tasks.filter((task) => isLoggableTask(task, projectById, categoryById));
}
