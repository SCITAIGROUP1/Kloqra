"use client";

import { ROUTES, type NotificationCreatedEvent, type NotificationDto } from "@kloqra/contracts";
import { create } from "zustand";
import { api } from "../api/client";
import { readUserIdFromToken } from "../auth/jwt-payload";
import {
  notificationKeysForWorkspace,
  notificationRecentKey,
  notificationUnreadKey
} from "./notification-cache-key";
import { getAccessToken } from "./session.store";

export const NOTIFICATIONS_UPDATED_EVENT = "kloqra:notifications-updated";

const UNREAD_POLL_MS = 60_000;

type UnreadEntry = { count: number; loading: boolean };
type RecentEntry = { items: NotificationDto[]; loading: boolean; limit: number };

type NotificationsStoreState = {
  unreadByWorkspace: Record<string, UnreadEntry>;
  recentByWorkspace: Record<string, RecentEntry>;
  unreadRefCounts: Record<string, number>;
  recentRefCounts: Record<string, number>;
  unreadPollTimer: ReturnType<typeof setInterval> | null;
  unreadPollWorkspaceId: string | null;
  socketConnected: boolean;

  refreshUnread: (userId: string, workspaceId: string) => Promise<void>;
  refreshRecent: (userId: string, workspaceId: string, limit: number) => Promise<void>;
  setRecentItems: (
    userId: string,
    workspaceId: string,
    limit: number,
    updater: NotificationDto[] | ((prev: NotificationDto[]) => NotificationDto[])
  ) => void;
  subscribeUnread: (userId: string, workspaceId: string) => () => void;
  subscribeRecent: (userId: string, workspaceId: string, limit: number) => () => void;
  applyNotificationPush: (payload: NotificationCreatedEvent) => void;
  setSocketConnected: (connected: boolean) => void;
  removeWorkspace: (workspaceId: string) => void;
  clear: () => void;
};

function parseUnreadRefKey(key: string): { userId: string; workspaceId: string } | null {
  const separator = key.lastIndexOf(":");
  if (separator <= 0) return null;
  return {
    userId: key.slice(0, separator),
    workspaceId: key.slice(separator + 1)
  };
}

function syncUnreadPoll(
  get: () => NotificationsStoreState,
  set: (partial: Partial<NotificationsStoreState>) => void
): void {
  const { unreadPollTimer, unreadPollWorkspaceId, socketConnected, unreadRefCounts } = get();
  const firstRefKey = Object.keys(unreadRefCounts)[0];
  const parsed = firstRefKey ? parseUnreadRefKey(firstRefKey) : null;
  const workspaceId = unreadPollWorkspaceId ?? parsed?.workspaceId ?? null;
  const hasSubscribers = Object.keys(unreadRefCounts).length > 0;

  if (unreadPollTimer) {
    clearInterval(unreadPollTimer);
    set({ unreadPollTimer: null });
  }

  // Live socket carries pushes — poll only while disconnected (safety net).
  if (!hasSubscribers || !workspaceId || !parsed || socketConnected) return;

  const timer = setInterval(() => {
    const activeKey = Object.keys(get().unreadRefCounts)[0];
    const active = activeKey ? parseUnreadRefKey(activeKey) : null;
    if (active) {
      void get().refreshUnread(active.userId, active.workspaceId);
    }
  }, UNREAD_POLL_MS);
  set({ unreadPollTimer: timer, unreadPollWorkspaceId: workspaceId });
}

function recentKey(userId: string, workspaceId: string, limit: number) {
  return notificationRecentKey(userId, workspaceId, limit);
}

function unreadKey(userId: string, workspaceId: string) {
  return notificationUnreadKey(userId, workspaceId);
}

let globalListenersAttached = false;
let onFocusHandler: (() => void) | null = null;
let onUpdatedHandler: (() => void) | null = null;

function attachGlobalListeners(
  refreshForWorkspace: (workspaceId: string) => void,
  getWorkspaceId: () => string | null
) {
  if (globalListenersAttached || typeof window === "undefined") return;
  onFocusHandler = () => {
    const ws = getWorkspaceId();
    if (ws) refreshForWorkspace(ws);
  };
  onUpdatedHandler = () => {
    const ws = getWorkspaceId();
    if (ws) refreshForWorkspace(ws);
  };
  window.addEventListener("focus", onFocusHandler);
  window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdatedHandler);
  globalListenersAttached = true;
}

function detachGlobalListeners() {
  if (!globalListenersAttached || typeof window === "undefined") return;
  if (onFocusHandler) window.removeEventListener("focus", onFocusHandler);
  if (onUpdatedHandler) window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdatedHandler);
  globalListenersAttached = false;
  onFocusHandler = null;
  onUpdatedHandler = null;
}

export const useNotificationsStore = create<NotificationsStoreState>((set, get) => ({
  unreadByWorkspace: {},
  recentByWorkspace: {},
  unreadRefCounts: {},
  recentRefCounts: {},
  unreadPollTimer: null,
  unreadPollWorkspaceId: null,
  socketConnected: false,

  clear: () => {
    detachGlobalListeners();
    const timer = get().unreadPollTimer;
    if (timer) clearInterval(timer);
    set({
      unreadByWorkspace: {},
      recentByWorkspace: {},
      unreadRefCounts: {},
      recentRefCounts: {},
      unreadPollTimer: null,
      unreadPollWorkspaceId: null,
      socketConnected: false
    });
  },

  removeWorkspace: (workspaceId) => {
    set((state) => {
      const unreadByWorkspace = { ...state.unreadByWorkspace };
      for (const key of notificationKeysForWorkspace(workspaceId, unreadByWorkspace)) {
        delete unreadByWorkspace[key];
      }

      const unreadRefCounts = { ...state.unreadRefCounts };
      for (const key of notificationKeysForWorkspace(workspaceId, unreadRefCounts)) {
        delete unreadRefCounts[key];
      }

      const recentByWorkspace = { ...state.recentByWorkspace };
      for (const key of notificationKeysForWorkspace(workspaceId, recentByWorkspace)) {
        delete recentByWorkspace[key];
      }

      const recentRefCounts = { ...state.recentRefCounts };
      for (const key of notificationKeysForWorkspace(workspaceId, recentRefCounts)) {
        delete recentRefCounts[key];
      }

      return { unreadByWorkspace, unreadRefCounts, recentByWorkspace, recentRefCounts };
    });
    syncUnreadPoll(get, set);
  },

  setSocketConnected: (connected) => {
    set({ socketConnected: connected });
    syncUnreadPoll(get, set);
  },

  refreshUnread: async (userId, workspaceId) => {
    if (!userId || !workspaceId) return;
    const key = unreadKey(userId, workspaceId);
    set((state) => ({
      unreadByWorkspace: {
        ...state.unreadByWorkspace,
        [key]: {
          count: state.unreadByWorkspace[key]?.count ?? 0,
          loading: true
        }
      }
    }));
    try {
      const res = await api<{ count: number }>(ROUTES.NOTIFICATIONS.UNREAD_COUNT, { workspaceId });
      set((state) => ({
        unreadByWorkspace: {
          ...state.unreadByWorkspace,
          [key]: { count: res.count, loading: false }
        }
      }));
    } catch {
      set((state) => ({
        unreadByWorkspace: {
          ...state.unreadByWorkspace,
          [key]: { count: 0, loading: false }
        }
      }));
    }
  },

  refreshRecent: async (userId, workspaceId, limit) => {
    if (!userId || !workspaceId) return;
    const key = recentKey(userId, workspaceId, limit);
    set((state) => ({
      recentByWorkspace: {
        ...state.recentByWorkspace,
        [key]: {
          items: state.recentByWorkspace[key]?.items ?? [],
          loading: true,
          limit
        }
      }
    }));
    try {
      const res = await api<{ items: NotificationDto[] }>(
        `${ROUTES.NOTIFICATIONS.LIST}?page=1&limit=${limit}`,
        { workspaceId }
      );
      set((state) => ({
        recentByWorkspace: {
          ...state.recentByWorkspace,
          [key]: { items: res.items ?? [], loading: false, limit }
        }
      }));
    } catch {
      set((state) => ({
        recentByWorkspace: {
          ...state.recentByWorkspace,
          [key]: { items: [], loading: false, limit }
        }
      }));
    }
  },

  setRecentItems: (userId, workspaceId, limit, updater) => {
    const key = recentKey(userId, workspaceId, limit);
    set((state) => {
      const prev = state.recentByWorkspace[key]?.items ?? [];
      const items = typeof updater === "function" ? updater(prev) : updater;
      return {
        recentByWorkspace: {
          ...state.recentByWorkspace,
          [key]: {
            items,
            loading: state.recentByWorkspace[key]?.loading ?? false,
            limit
          }
        }
      };
    });
  },

  subscribeUnread: (userId, workspaceId) => {
    const key = unreadKey(userId, workspaceId);
    const state = get();
    const nextCount = (state.unreadRefCounts[key] ?? 0) + 1;
    set((s) => ({
      unreadRefCounts: { ...s.unreadRefCounts, [key]: nextCount }
    }));

    if (state.unreadPollTimer && state.unreadPollWorkspaceId !== workspaceId) {
      clearInterval(state.unreadPollTimer);
      set({ unreadPollTimer: null, unreadPollWorkspaceId: null });
    }

    if (get().unreadByWorkspace[key] === undefined) {
      void get().refreshUnread(userId, workspaceId);
    }

    if (!get().unreadPollTimer && !get().socketConnected) {
      syncUnreadPoll(get, set);
      attachGlobalListeners(
        (ws) => {
          const currentUserId = readUserIdFromToken(getAccessToken());
          if (currentUserId) void get().refreshUnread(currentUserId, ws);
        },
        () => get().unreadPollWorkspaceId
      );
    }

    return () => {
      const current = get();
      const remaining = Math.max(0, (current.unreadRefCounts[key] ?? 1) - 1);
      const nextRefCounts = { ...current.unreadRefCounts };
      if (remaining === 0) {
        delete nextRefCounts[key];
      } else {
        nextRefCounts[key] = remaining;
      }
      set({ unreadRefCounts: nextRefCounts });

      if (remaining === 0 && Object.keys(nextRefCounts).length === 0 && current.unreadPollTimer) {
        clearInterval(current.unreadPollTimer);
        detachGlobalListeners();
        set({ unreadPollTimer: null, unreadPollWorkspaceId: null });
      }
    };
  },

  subscribeRecent: (userId, workspaceId, limit) => {
    const key = recentKey(userId, workspaceId, limit);
    const nextCount = (get().recentRefCounts[key] ?? 0) + 1;
    set((s) => ({
      recentRefCounts: { ...s.recentRefCounts, [key]: nextCount }
    }));

    if (get().recentByWorkspace[key] === undefined) {
      void get().refreshRecent(userId, workspaceId, limit);
    }

    return () => {
      const current = get();
      const remaining = Math.max(0, (current.recentRefCounts[key] ?? 1) - 1);
      const nextRefCounts = { ...current.recentRefCounts };
      if (remaining === 0) {
        delete nextRefCounts[key];
      } else {
        nextRefCounts[key] = remaining;
      }
      set({ recentRefCounts: nextRefCounts });
    };
  },

  applyNotificationPush: (payload) => {
    const userId = readUserIdFromToken(getAccessToken());
    if (!userId) return;
    const { workspaceId, unreadCount, notification } = payload;
    const unreadCacheKey = unreadKey(userId, workspaceId);
    set((state) => {
      const nextUnread = {
        ...state.unreadByWorkspace,
        [unreadCacheKey]: { count: unreadCount, loading: false }
      };

      const nextRecent = { ...state.recentByWorkspace };
      const recentPrefix = `${userId}:${workspaceId}:`;
      for (const key of Object.keys(nextRecent)) {
        if (!key.startsWith(recentPrefix)) continue;
        const entry = nextRecent[key];
        if (!entry) continue;
        const exists = entry.items.some((item) => item.id === notification.id);
        nextRecent[key] = {
          ...entry,
          items: exists ? entry.items : [notification, ...entry.items].slice(0, entry.limit)
        };
      }

      return {
        unreadByWorkspace: nextUnread,
        recentByWorkspace: nextRecent
      };
    });
  }
}));
