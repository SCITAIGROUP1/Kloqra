"use client";

import { ROUTES, type NotificationDto } from "@kloqra/contracts";
import { useCallback, useEffect } from "react";
import { api } from "../api/client";
import { NOTIFICATIONS_UPDATED_EVENT, useNotificationsStore } from "../stores/notifications-store";
import { usePaginatedList } from "./use-paginated-list";

export { NOTIFICATIONS_UPDATED_EVENT };

const EMPTY_NOTIFICATIONS: NotificationDto[] = [];

/** Notify all unread-count subscribers to refresh (e.g. after mark read). */
export function dispatchNotificationsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
  }
}

export function useNotificationUnreadCount(workspaceId: string, enabled = true) {
  const count = useNotificationsStore((s) =>
    enabled && workspaceId ? (s.unreadByWorkspace[workspaceId]?.count ?? 0) : 0
  );
  const loading = useNotificationsStore((s) =>
    enabled && workspaceId ? (s.unreadByWorkspace[workspaceId]?.loading ?? false) : false
  );
  const subscribeUnread = useNotificationsStore((s) => s.subscribeUnread);
  const refreshUnread = useNotificationsStore((s) => s.refreshUnread);

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    return subscribeUnread(workspaceId);
  }, [enabled, workspaceId, subscribeUnread]);

  const refresh = useCallback(() => refreshUnread(workspaceId), [workspaceId, refreshUnread]);

  return { count, loading, refresh };
}

export function useRecentNotifications(workspaceId: string, limit = 8, enabled = true) {
  const key = enabled && workspaceId ? `${workspaceId}:${limit}` : "";
  const items = useNotificationsStore((s) =>
    key ? (s.recentByWorkspace[key]?.items ?? EMPTY_NOTIFICATIONS) : EMPTY_NOTIFICATIONS
  );
  const loading = useNotificationsStore((s) =>
    key ? (s.recentByWorkspace[key]?.loading ?? false) : false
  );
  const subscribeRecent = useNotificationsStore((s) => s.subscribeRecent);
  const refreshRecent = useNotificationsStore((s) => s.refreshRecent);
  const setRecentItems = useNotificationsStore((s) => s.setRecentItems);

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    return subscribeRecent(workspaceId, limit);
  }, [enabled, workspaceId, limit, subscribeRecent]);

  const refresh = useCallback(
    () => refreshRecent(workspaceId, limit),
    [workspaceId, limit, refreshRecent]
  );

  const setItems = useCallback(
    (updater: NotificationDto[] | ((prev: NotificationDto[]) => NotificationDto[])) => {
      if (!workspaceId) return;
      setRecentItems(workspaceId, limit, updater);
    },
    [workspaceId, limit, setRecentItems]
  );

  return { items, loading, refresh, setItems };
}

export function usePaginatedNotifications(
  workspaceId: string,
  options?: { unreadOnly?: boolean; enabled?: boolean }
) {
  return usePaginatedList<NotificationDto>({
    workspaceId,
    basePath: ROUTES.NOTIFICATIONS.LIST,
    enabled: options?.enabled ?? true,
    filters: options?.unreadOnly ? { unreadOnly: "true" } : undefined
  });
}

export async function markNotificationRead(
  workspaceId: string,
  id: string,
  read: boolean
): Promise<NotificationDto> {
  const result = await api<NotificationDto>(ROUTES.NOTIFICATIONS.BY_ID(id), {
    method: "PATCH",
    workspaceId,
    body: JSON.stringify({ read })
  });
  dispatchNotificationsUpdated();
  return result;
}

export async function markAllNotificationsRead(workspaceId: string): Promise<{ updated: number }> {
  const result = await api<{ updated: number }>(ROUTES.NOTIFICATIONS.MARK_ALL_READ, {
    method: "POST",
    workspaceId,
    body: JSON.stringify({})
  });
  dispatchNotificationsUpdated();
  return result;
}

export function formatNotificationTimeAgo(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString();
}
