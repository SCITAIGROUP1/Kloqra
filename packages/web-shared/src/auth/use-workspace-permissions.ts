import { useMemo } from "react";
import { useSessionStore } from "../stores/session.store";

export function useWorkspacePermissions() {
  const session = useSessionStore((s) => s.session);

  return useMemo(() => {
    if (!session) {
      return {
        canManageBilling: () => false,
        canInviteMembers: () => false,
        canManageWorkspaceSettings: () => false,
        canManageProject: () => false,
        canManageAnyProject: () => false,
        isProjectManager: () => false,
        isGlobalAdmin: () => false,
        managedProjectIds: [],
        role: "MEMBER" as const
      };
    }
    const role = session.workspaceRole ?? "MEMBER";
    const tenantRole = session.tenantRole ?? "MEMBER";
    const isOwnerOrAdmin = tenantRole === "OWNER" || tenantRole === "ADMIN" || role === "ADMIN";
    const managedProjectIds = session.managedProjectIds || [];

    return {
      canManageBilling: () => tenantRole === "OWNER",
      canInviteMembers: () => isOwnerOrAdmin,
      canManageWorkspaceSettings: () => isOwnerOrAdmin,
      canManageProject: (projectId: string) => {
        if (isOwnerOrAdmin) return true;
        return managedProjectIds.includes(projectId);
      },
      canManageAnyProject: () => {
        if (isOwnerOrAdmin) return true;
        return managedProjectIds.length > 0;
      },
      isProjectManager: (projectId: string) => managedProjectIds.includes(projectId),
      isGlobalAdmin: () => tenantRole === "OWNER" || tenantRole === "ADMIN",
      managedProjectIds,
      role
    };
  }, [session]);
}
