import type { ProjectDto, TaskDto, WorkspaceWithRoleDto } from "@kloqra/contracts";
import { create } from "zustand";

interface ProjectsState {
  projects: ProjectDto[];
  tasks: TaskDto[];
  workspaceNamesById: Record<string, string>;
  setProjects: (p: ProjectDto[]) => void;
  setTasks: (t: TaskDto[]) => void;
  setWorkspaces: (workspaces: WorkspaceWithRoleDto[]) => void;
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: [],
  tasks: [],
  workspaceNamesById: {},
  setProjects: (projects) => set({ projects }),
  setTasks: (tasks) => set({ tasks }),
  setWorkspaces: (workspaces) =>
    set({
      workspaceNamesById: Object.fromEntries(workspaces.map((w) => [w.id, w.name]))
    })
}));
