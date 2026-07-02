import { ROUTES, type CategoryDto, type ProjectDto, type TaskDto } from "@kloqra/contracts";
import { fetchListItems } from "@kloqra/web-shared";
import { useProjectsStore } from "@/stores/projects.store";

export type EntryCatalog = {
  projects: ProjectDto[];
  tasks: TaskDto[];
  categories: CategoryDto[];
};

/** Full workspace catalog for display (includes inactive entities). */
export async function loadEntryCatalog(workspaceId: string): Promise<EntryCatalog> {
  const [projects, tasks, categories] = await Promise.all([
    fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId, bypassCache: true }),
    fetchListItems<TaskDto>(ROUTES.TASKS.LIST, { workspaceId, bypassCache: true }),
    fetchListItems<CategoryDto>(ROUTES.CATEGORIES.LIST, { workspaceId, bypassCache: true })
  ]);

  return { projects, tasks, categories };
}

/** Refetch full catalog and update the shared projects store. */
export async function refreshEntryCatalog(workspaceId: string): Promise<EntryCatalog> {
  const catalog = await loadEntryCatalog(workspaceId);
  const store = useProjectsStore.getState();
  store.setProjects(catalog.projects);
  store.setTasks(catalog.tasks);
  store.setCategories(catalog.categories);
  return catalog;
}
