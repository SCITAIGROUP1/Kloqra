import type { WorkspaceWithRoleDto } from "@kloqra/contracts";

export function formatWorkspaceRole(role: WorkspaceWithRoleDto["role"]): string {
  if (role === "ADMIN") return "Workspace admin";
  return "Member";
}

/** Member portal chrome — members are not shown admin or project-lead labels. */
export function formatMemberPortalWorkspaceLabel(): string {
  return "Member";
}

/** Admin app chrome label for workspace list rows and switcher subtitle. */
export function formatAdminWorkspaceAccessLabel(
  workspaceRole: WorkspaceWithRoleDto["role"],
  managedProjectIds?: string[],
  tenantRole?: "OWNER" | "ADMIN" | null
): string {
  if (
    tenantRole === "ADMIN" &&
    workspaceRole === "MEMBER" &&
    managedProjectIds &&
    managedProjectIds.length > 0
  ) {
    return "Project manager";
  }
  if (tenantRole === "ADMIN") return "Organization admin";
  if (tenantRole === "OWNER" && workspaceRole === "ADMIN") return "Owner · Workspace admin";
  if (tenantRole === "OWNER" && managedProjectIds && managedProjectIds.length > 0) {
    return "Owner · Project manager";
  }

  const base =
    workspaceRole === "ADMIN"
      ? "Workspace admin"
      : managedProjectIds && managedProjectIds.length > 0
        ? "Project manager"
        : formatWorkspaceRole(workspaceRole);

  if (tenantRole === "OWNER") return `Owner · ${base}`;
  return base;
}

export function formatTenantRoleLabel(tenantRole?: "OWNER" | "ADMIN" | null): string {
  if (tenantRole === "OWNER") return "Organization owner";
  if (tenantRole === "ADMIN") return "Organization admin";
  return "Member";
}
