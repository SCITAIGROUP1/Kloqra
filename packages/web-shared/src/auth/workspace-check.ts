import { ROUTES } from "@kloqra/contracts";
import { api } from "../api/client";

/**
 * Checks if the user belongs to multiple workspaces (optionally filtering by role).
 */
export async function hasMultipleWorkspaces(
  activeWorkspaceId: string,
  roleFilter?: "ADMIN"
): Promise<boolean> {
  try {
    const list = await api<any[]>(ROUTES.WORKSPACES.LIST, {
      workspaceId: activeWorkspaceId
    });
    const filtered = roleFilter ? list.filter((w) => w.role === roleFilter) : list;
    return filtered.length > 1;
  } catch {
    return false;
  }
}
