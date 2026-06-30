import type { NotificationDto } from "@kloqra/contracts";
import { markNotificationRead } from "../../hooks/use-notifications";
import {
  invalidateWorkspaceData,
  scopesForNotificationType
} from "../../realtime/workspace-data-sync";

/** Marks read, invalidates related workspace caches, and optionally navigates. */
export async function activateNotification(
  workspaceId: string,
  item: NotificationDto,
  navigate?: (href: string) => void
): Promise<void> {
  if (!item.readAt) {
    await markNotificationRead(workspaceId, item.id, true);
  }

  const scopes = scopesForNotificationType(item.type);
  if (scopes.length > 0) {
    invalidateWorkspaceData(workspaceId, scopes);
  }

  const href = item.metadata?.href;
  if (href && navigate) {
    navigate(href);
  }
}
