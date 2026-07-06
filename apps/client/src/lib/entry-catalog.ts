import { ROUTES } from "@kloqra/contracts";
import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import { fetchListItems } from "@kloqra/web-shared";
import { useProjectsStore } from "@/stores/projects.store";

/** Fresh projects, tasks, and categories for labeling and locking time entries. */
export async function loadEntryCatalog(workspaceId: string) {
  const opts = { workspaceId, bypassCache: true };
  const [tasks, projects, categories] = await Promise.all([
    fetchListItems<TaskDto>(ROUTES.TASKS.LIST, opts),
    fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, opts),
    fetchListItems<CategoryDto>(ROUTES.CATEGORIES.LIST, opts)
  ]);
  return { tasks, projects, categories };
}

/** Reload catalog into the shared projects store (for live logging selectors). */
export async function refreshEntryCatalog(workspaceId: string) {
  const data = await loadEntryCatalog(workspaceId);
  const { setTasks, setProjects } = useProjectsStore.getState();
  setTasks(data.tasks);
  setProjects(data.projects);
  return data;
}
