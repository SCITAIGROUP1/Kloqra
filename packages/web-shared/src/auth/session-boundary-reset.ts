import { clearInflightGetRequests } from "../api/inflight-requests";
import { invalidateListItemsCache } from "../api/list-items-cache";
import { clearOrgSlugCookie } from "../features/auth/org-slug-cookie";
import { clearThemeHydration } from "../hooks/theme-preference-state";
import { resetQueryClient } from "../query/query-client";
import { clearSessionScopedBrowserStorage } from "../storage/session-storage-sweep";
import { useNotificationsStore } from "../stores/notifications-store";
import { useUserProfileStore } from "../stores/user-profile.store";
import { useWorkspacesStore } from "../stores/workspaces.store";
import type { SessionBoundaryLevel, SessionIdentity } from "./session-identity";

export function removeWorkspaceScopedKeys(
  workspaceId: string | null,
  tenantId: string | null
): void {
  if (workspaceId) {
    useUserProfileStore.getState().removeKey(workspaceId);
    useNotificationsStore.getState().removeWorkspace(workspaceId);
    invalidateListItemsCache({ workspaceId });
  }
  if (tenantId) {
    useUserProfileStore.getState().removeKey(`tenant:${tenantId}`);
    useNotificationsStore.getState().removeWorkspace(`tenant:${tenantId}`);
  }
}

export function applySharedBoundaryReset(
  level: SessionBoundaryLevel,
  prev: SessionIdentity | null
): void {
  clearInflightGetRequests();

  if (level === "full") {
    invalidateListItemsCache();
    useUserProfileStore.getState().clear();
    useNotificationsStore.getState().clear();
    useWorkspacesStore.getState().clear();
    resetQueryClient();
    clearThemeHydration();
    clearOrgSlugCookie();
    clearSessionScopedBrowserStorage(prev);
    return;
  }

  if (level === "workspace" && prev) {
    removeWorkspaceScopedKeys(prev.workspaceId, prev.tenantId);
    invalidateListItemsCache(prev.workspaceId ? { workspaceId: prev.workspaceId } : undefined);
  }
}
