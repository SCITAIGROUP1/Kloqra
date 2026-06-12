"use client";

import { ROUTES, type NotificationDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { usePaginatedList } from "./use-paginated-list";

export function useNotificationUnreadCount(workspaceId: string, enabled = true) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !workspaceId) return;
    setLoading(true);
    try {
      const res = await api<{ count: number }>(ROUTES.NOTIFICATIONS.UNREAD_COUNT, { workspaceId });
      setCount(res.count);
    } catch {
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [enabled, workspaceId]);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(() => void refresh(), 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [refresh]);

  return { count, loading, refresh };
}

export function useRecentNotifications(workspaceId: string, limit = 8, enabled = true) {
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !workspaceId) return;
    setLoading(true);
    try {
      const res = await api<{ items: NotificationDto[] }>(
        `${ROUTES.NOTIFICATIONS.LIST}?page=1&limit=${limit}`,
        { workspaceId }
      );
      setItems(res.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, workspaceId, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
  return api<NotificationDto>(ROUTES.NOTIFICATIONS.BY_ID(id), {
    method: "PATCH",
    workspaceId,
    body: JSON.stringify({ read })
  });
}

export async function markAllNotificationsRead(workspaceId: string): Promise<{ updated: number }> {
  return api<{ updated: number }>(ROUTES.NOTIFICATIONS.MARK_ALL_READ, {
    method: "POST",
    workspaceId,
    body: JSON.stringify({})
  });
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
