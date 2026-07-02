import {
  unwrapListItems,
  type CategoryDto,
  type PaginatedResponse,
  type ProjectDto,
  type TaskDto,
  type WorkspaceWithRoleDto
} from "@kloqra/contracts";
import { create } from "zustand";

function asList<T>(value: T[] | PaginatedResponse<T>): T[] {
  return unwrapListItems(value);
}

interface ProjectsState {
  projects: ProjectDto[];
  tasks: TaskDto[];
  categories: CategoryDto[];
  workspaceNamesById: Record<string, string>;
  setProjects: (p: ProjectDto[] | PaginatedResponse<ProjectDto>) => void;
  setTasks: (t: TaskDto[] | PaginatedResponse<TaskDto>) => void;
  setCategories: (c: CategoryDto[] | PaginatedResponse<CategoryDto>) => void;
  setWorkspaces: (workspaces: WorkspaceWithRoleDto[]) => void;
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: [],
  tasks: [],
  categories: [],
  workspaceNamesById: {},
  setProjects: (projects) => set({ projects: asList(projects) }),
  setTasks: (tasks) => set({ tasks: asList(tasks) }),
  setCategories: (categories) => set({ categories: asList(categories) }),
  setWorkspaces: (workspaces) =>
    set({
      workspaceNamesById: Object.fromEntries(workspaces.map((w) => [w.id, w.name]))
    })
}));
