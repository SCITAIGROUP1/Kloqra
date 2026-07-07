import {
  unwrapListItems,
  type PaginatedResponse,
  type ProjectDto,
  type TaskDto,
  type WorkspaceWithRoleDto
} from "@kloqra/contracts";
import { getWorkspaceId } from "@kloqra/web-shared";
import { create } from "zustand";

function asList<T>(value: T[] | PaginatedResponse<T>): T[] {
  return unwrapListItems(value);
}

interface ProjectsState {
  catalogWorkspaceId: string | null;
  projects: ProjectDto[];
  tasks: TaskDto[];
  workspaceNamesById: Record<string, string>;
  setProjects: (workspaceId: string, p: ProjectDto[] | PaginatedResponse<ProjectDto>) => void;
  setTasks: (workspaceId: string, t: TaskDto[] | PaginatedResponse<TaskDto>) => void;
  setWorkspaces: (workspaces: WorkspaceWithRoleDto[]) => void;
  clear: () => void;
}

function shouldApplyCatalog(workspaceId: string): boolean {
  const active = getWorkspaceId();
  return Boolean(active && active === workspaceId);
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  catalogWorkspaceId: null,
  projects: [],
  tasks: [],
  workspaceNamesById: {},
  setProjects: (workspaceId, projects) => {
    if (!shouldApplyCatalog(workspaceId)) return;
    set({ catalogWorkspaceId: workspaceId, projects: asList(projects) });
  },
  setTasks: (workspaceId, tasks) => {
    if (!shouldApplyCatalog(workspaceId)) return;
    set({ catalogWorkspaceId: workspaceId, tasks: asList(tasks) });
  },
  setWorkspaces: (workspaces) =>
    set({
      workspaceNamesById: Object.fromEntries(workspaces.map((w) => [w.id, w.name]))
    }),
  clear: () => set({ catalogWorkspaceId: null, projects: [], tasks: [], workspaceNamesById: {} })
}));
