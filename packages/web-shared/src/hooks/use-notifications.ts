"use client";

import { ROUTES, type NotificationDto } from "@kloqra/contracts";
import { useCallback, useEffect, useMemo } from "react";
import { api } from "../api/client";
import { readUserIdFromToken } from "../auth/jwt-payload";
import { notificationRecentKey, notificationUnreadKey } from "../stores/notification-cache-key";
import { NOTIFICATIONS_UPDATED_EVENT, useNotificationsStore } from "../stores/notifications-store";
import { getAccessToken, useSessionStore } from "../stores/session.store";
import { usePaginatedList } from "./use-paginated-list";

export { NOTIFICATIONS_UPDATED_EVENT };

const EMPTY_NOTIFICATIONS: NotificationDto[] = [];

function useAlignedNotificationScope(workspaceId: string, enabled = true) {
  const sessionUserId = useSessionStore((s) => s.session?.user?.id);
  const tokenUserId = readUserIdFromToken(getAccessToken());
  const aligned = Boolean(
    enabled && workspaceId && sessionUserId && tokenUserId && sessionUserId === tokenUserId
  );

  return useMemo(
    () => ({
      userId: aligned ? sessionUserId! : "",
      enabled: aligned
    }),
    [aligned, sessionUserId]
  );
}

/** Notify all unread-count subscribers to refresh (e.g. after mark read). */
export function dispatchNotificationsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
  }
}

export function useNotificationUnreadCount(workspaceId: string, enabled = true) {
  const { userId, enabled: aligned } = useAlignedNotificationScope(workspaceId, enabled);
  const cacheKey = aligned ? notificationUnreadKey(userId, workspaceId) : "";
  const count = useNotificationsStore((s) =>
    cacheKey ? (s.unreadByWorkspace[cacheKey]?.count ?? 0) : 0
  );
  const loading = useNotificationsStore((s) =>
    cacheKey ? (s.unreadByWorkspace[cacheKey]?.loading ?? false) : false
  );
  const subscribeUnread = useNotificationsStore((s) => s.subscribeUnread);
  const refreshUnread = useNotificationsStore((s) => s.refreshUnread);

  useEffect(() => {
    if (!aligned) return;
    return subscribeUnread(userId, workspaceId);
  }, [aligned, userId, workspaceId, subscribeUnread]);

  const refresh = useCallback(
    () => refreshUnread(userId, workspaceId),
    [userId, workspaceId, refreshUnread]
  );

  return { count, loading, refresh, aligned };
}

export function useRecentNotifications(workspaceId: string, limit = 8, enabled = true) {
  const { userId, enabled: aligned } = useAlignedNotificationScope(workspaceId, enabled);
  const key = aligned ? notificationRecentKey(userId, workspaceId, limit) : "";
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
    if (!aligned) return;
    return subscribeRecent(userId, workspaceId, limit);
  }, [aligned, userId, workspaceId, limit, subscribeRecent]);

  const refresh = useCallback(
    () => refreshRecent(userId, workspaceId, limit),
    [userId, workspaceId, limit, refreshRecent]
  );

  const setItems = useCallback(
    (updater: NotificationDto[] | ((prev: NotificationDto[]) => NotificationDto[])) => {
      if (!aligned) return;
      setRecentItems(userId, workspaceId, limit, updater);
    },
    [aligned, userId, workspaceId, limit, setRecentItems]
  );

  return { items, loading, refresh, setItems, aligned };
}

export function usePaginatedNotifications(
  workspaceId: string,
  options?: { unreadOnly?: boolean; enabled?: boolean }
) {
  const { enabled: aligned } = useAlignedNotificationScope(workspaceId, options?.enabled ?? true);

  return usePaginatedList<NotificationDto>({
    workspaceId,
    basePath: ROUTES.NOTIFICATIONS.LIST,
    enabled: aligned,
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
