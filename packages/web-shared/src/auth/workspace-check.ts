import { ROUTES } from "@kloqra/contracts";
import type { WorkspaceListItemDto } from "@kloqra/contracts";
import { api } from "../api/client";
import { filterAdminAccessibleWorkspaces } from "./admin-context";

export type WorkspaceCheckOptions = {
  roleFilter?: "ADMIN";
  /** Include workspace ADMINs and project managers (admin app access). */
  filterAdminAccess?: boolean;
};

/**
 * Checks if the user belongs to multiple workspaces (optionally filtering by role).
 */
export async function hasMultipleWorkspaces(
  activeWorkspaceId: string,
  options?: WorkspaceCheckOptions | "ADMIN"
): Promise<boolean> {
  const normalized = typeof options === "string" ? { roleFilter: options } : options;
  try {
    const list = await api<WorkspaceListItemDto[]>(ROUTES.WORKSPACES.LIST, {
      workspaceId: activeWorkspaceId
    });
    const filtered = normalized?.filterAdminAccess
      ? filterAdminAccessibleWorkspaces(list)
      : normalized?.roleFilter
        ? list.filter((w) => w.role === normalized.roleFilter)
        : list;
    return filtered.length > 1;
  } catch {
    return false;
  }
}
