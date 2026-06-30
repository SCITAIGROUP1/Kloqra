import type { WorkspaceWithRoleDto } from "@kloqra/contracts";
import { create } from "zustand";

interface WorkspacesState {
  workspaces: WorkspaceWithRoleDto[];
  setWorkspaces: (workspaces: WorkspaceWithRoleDto[]) => void;
}

export const useWorkspacesStore = create<WorkspacesState>((set) => ({
  workspaces: [],
  setWorkspaces: (workspaces) => set({ workspaces })
}));
