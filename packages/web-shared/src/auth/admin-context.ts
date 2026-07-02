import type { AuthSessionDto, WorkspaceListItemDto, WorkspaceWithRoleDto } from "@kloqra/contracts";
import { formatAdminWorkspaceAccessLabel } from "./admin-access-label";

export type AdminContextMode = "account" | "workspace";

export type AdminAccessibleWorkspace = WorkspaceListItemDto | WorkspaceWithRoleDto;

export type AdminContextBreadcrumbSegment = {
  label: string;
  href?: string;
};

export function hasAdminWorkspaceAccess(workspace: AdminAccessibleWorkspace): boolean {
  return (
    workspace.role === "ADMIN" ||
    Boolean(workspace.managedProjectIds && workspace.managedProjectIds.length > 0)
  );
}

/** Workspaces the user can open in the admin app (ADMIN or project manager). */
export function filterAdminAccessibleWorkspaces<T extends AdminAccessibleWorkspace>(
  workspaces: readonly T[]
): T[] {
  return workspaces.filter(hasAdminWorkspaceAccess);
}

export function countAdminContexts(
  session: Pick<AuthSessionDto, "tenantRole"> | null | undefined,
  workspaces: readonly AdminAccessibleWorkspace[]
): number {
  const orgContext = session?.tenantRole === "OWNER" ? 1 : 0;
  return orgContext + filterAdminAccessibleWorkspaces(workspaces).length;
}

export function shouldShowAdminContextPicker(
  session: Pick<AuthSessionDto, "tenantRole"> | null | undefined,
  workspaces: readonly AdminAccessibleWorkspace[]
): boolean {
  return countAdminContexts(session, workspaces) >= 3;
}

export function resolveAdminContextBreadcrumb(options: {
  session: AuthSessionDto | null | undefined;
  tenantName?: string | null;
  contextMode: AdminContextMode;
}): AdminContextBreadcrumbSegment[] {
  const { session, tenantName, contextMode } = options;
  if (!session) return [];

  const orgName = tenantName?.trim() || "Organization";
  const isOwner = session.tenantRole === "OWNER";
  const accessLabel = formatAdminWorkspaceAccessLabel(
    session.workspaceRole ?? "MEMBER",
    session.managedProjectIds,
    session.tenantRole
  );

  if (contextMode === "account" && isOwner) {
    return [{ label: orgName, href: "/account" }, { label: "Organization" }];
  }

  if (contextMode === "workspace") {
    if (isOwner) {
      return [
        { label: orgName, href: "/account" },
        { label: session.workspaceName ?? "Workspace", href: "/dashboard" },
        { label: accessLabel }
      ];
    }

    return [
      { label: session.workspaceName ?? "Workspace", href: "/dashboard" },
      { label: accessLabel }
    ];
  }

  return [];
}
