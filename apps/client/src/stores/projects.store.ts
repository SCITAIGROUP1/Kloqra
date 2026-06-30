import {
  unwrapListItems,
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
  workspaceNamesById: Record<string, string>;
  setProjects: (p: ProjectDto[] | PaginatedResponse<ProjectDto>) => void;
  setTasks: (t: TaskDto[] | PaginatedResponse<TaskDto>) => void;
  setWorkspaces: (workspaces: WorkspaceWithRoleDto[]) => void;
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: [],
  tasks: [],
  workspaceNamesById: {},
  setProjects: (projects) => set({ projects: asList(projects) }),
  setTasks: (tasks) => set({ tasks: asList(tasks) }),
  setWorkspaces: (workspaces) =>
    set({
      workspaceNamesById: Object.fromEntries(workspaces.map((w) => [w.id, w.name]))
    })
}));
