"use client";

import { DEFAULT_TABLE_PAGE_SIZE, ROUTES, type PlatformNotificationDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import {
  dispatchPlatformNotificationsUpdated,
  usePlatformNotificationsStore
} from "../stores/platform-notifications-store";

export {
  PLATFORM_NOTIFICATIONS_UPDATED_EVENT,
  dispatchPlatformNotificationsUpdated
} from "../stores/platform-notifications-store";

const EMPTY_PLATFORM_NOTIFICATIONS: PlatformNotificationDto[] = [];

export function usePlatformNotificationUnreadCount(enabled = true) {
  const count = usePlatformNotificationsStore((s) => (enabled ? s.unread.count : 0));
  const loading = usePlatformNotificationsStore((s) => (enabled ? s.unread.loading : false));
  const subscribeUnread = usePlatformNotificationsStore((s) => s.subscribeUnread);
  const refreshUnread = usePlatformNotificationsStore((s) => s.refreshUnread);

  useEffect(() => {
    if (!enabled) return;
    return subscribeUnread();
  }, [enabled, subscribeUnread]);

  const refresh = useCallback(() => refreshUnread(), [refreshUnread]);

  return { count, loading, refresh };
}

export function useRecentPlatformNotifications(limit = 8, enabled = true) {
  const items = usePlatformNotificationsStore((s) =>
    enabled
      ? (s.recentByLimit[limit]?.items ?? EMPTY_PLATFORM_NOTIFICATIONS)
      : EMPTY_PLATFORM_NOTIFICATIONS
  );
  const loading = usePlatformNotificationsStore((s) =>
    enabled ? (s.recentByLimit[limit]?.loading ?? false) : false
  );
  const subscribeRecent = usePlatformNotificationsStore((s) => s.subscribeRecent);
  const refreshRecent = usePlatformNotificationsStore((s) => s.refreshRecent);
  const setRecentItems = usePlatformNotificationsStore((s) => s.setRecentItems);

  useEffect(() => {
    if (!enabled) return;
    return subscribeRecent(limit);
  }, [enabled, limit, subscribeRecent]);

  const refresh = useCallback(() => refreshRecent(limit), [limit, refreshRecent]);

  const setItems = useCallback(
    (
      updater:
        | PlatformNotificationDto[]
        | ((prev: PlatformNotificationDto[]) => PlatformNotificationDto[])
    ) => {
      setRecentItems(limit, updater);
    },
    [limit, setRecentItems]
  );

  return { items, loading, refresh, setItems };
}

export function usePaginatedPlatformNotifications(options?: {
  unreadOnly?: boolean;
  enabled?: boolean;
}) {
  const enabled = options?.enabled ?? true;
  const unreadOnly = options?.unreadOnly ?? false;
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [items, setItems] = useState<PlatformNotificationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(unreadOnly ? { unreadOnly: "true" } : {})
      });
      const res = await api<{
        items: PlatformNotificationDto[];
        total: number;
        totalPages: number;
      }>(`${ROUTES.PLATFORM.NOTIFICATIONS}?${query.toString()}`);
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } finally {
      setLoading(false);
    }
  }, [enabled, page, limit, unreadOnly]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    setPage(1);
  }, [unreadOnly]);

  return {
    items,
    page,
    setPage,
    total,
    totalPages,
    limit,
    setLimit,
    loading,
    reload
  };
}

export async function markPlatformNotificationRead(id: string, read: boolean) {
  await api(ROUTES.PLATFORM.NOTIFICATION(id), {
    method: "PATCH",
    body: JSON.stringify({ read })
  });
  dispatchPlatformNotificationsUpdated();
}

export async function markAllPlatformNotificationsRead(unreadOnly = true) {
  await api(ROUTES.PLATFORM.NOTIFICATIONS_MARK_ALL_READ, {
    method: "POST",
    body: JSON.stringify({ unreadOnly })
  });
  dispatchPlatformNotificationsUpdated();
}

export function formatPlatformNotificationTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
