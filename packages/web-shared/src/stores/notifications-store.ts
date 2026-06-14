"use client";

import { ROUTES, type NotificationDto } from "@kloqra/contracts";
import { create } from "zustand";
import { api } from "../api/client";

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

  refreshUnread: (workspaceId: string) => Promise<void>;
  refreshRecent: (workspaceId: string, limit: number) => Promise<void>;
  setRecentItems: (
    workspaceId: string,
    limit: number,
    updater: NotificationDto[] | ((prev: NotificationDto[]) => NotificationDto[])
  ) => void;
  subscribeUnread: (workspaceId: string) => () => void;
  subscribeRecent: (workspaceId: string, limit: number) => () => void;
};

function recentKey(workspaceId: string, limit: number) {
  return `${workspaceId}:${limit}`;
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

  refreshUnread: async (workspaceId) => {
    if (!workspaceId) return;
    set((state) => ({
      unreadByWorkspace: {
        ...state.unreadByWorkspace,
        [workspaceId]: {
          count: state.unreadByWorkspace[workspaceId]?.count ?? 0,
          loading: true
        }
      }
    }));
    try {
      const res = await api<{ count: number }>(ROUTES.NOTIFICATIONS.UNREAD_COUNT, { workspaceId });
      set((state) => ({
        unreadByWorkspace: {
          ...state.unreadByWorkspace,
          [workspaceId]: { count: res.count, loading: false }
        }
      }));
    } catch {
      set((state) => ({
        unreadByWorkspace: {
          ...state.unreadByWorkspace,
          [workspaceId]: { count: 0, loading: false }
        }
      }));
    }
  },

  refreshRecent: async (workspaceId, limit) => {
    if (!workspaceId) return;
    const key = recentKey(workspaceId, limit);
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

  setRecentItems: (workspaceId, limit, updater) => {
    const key = recentKey(workspaceId, limit);
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

  subscribeUnread: (workspaceId) => {
    const state = get();
    const nextCount = (state.unreadRefCounts[workspaceId] ?? 0) + 1;
    set((s) => ({
      unreadRefCounts: { ...s.unreadRefCounts, [workspaceId]: nextCount }
    }));

    if (state.unreadPollTimer && state.unreadPollWorkspaceId !== workspaceId) {
      clearInterval(state.unreadPollTimer);
      set({ unreadPollTimer: null, unreadPollWorkspaceId: null });
    }

    if (get().unreadByWorkspace[workspaceId] === undefined) {
      void get().refreshUnread(workspaceId);
    }

    if (!get().unreadPollTimer) {
      const timer = setInterval(() => void get().refreshUnread(workspaceId), UNREAD_POLL_MS);
      set({ unreadPollTimer: timer, unreadPollWorkspaceId: workspaceId });
      attachGlobalListeners(
        (ws) => void get().refreshUnread(ws),
        () => get().unreadPollWorkspaceId
      );
    }

    return () => {
      const current = get();
      const remaining = Math.max(0, (current.unreadRefCounts[workspaceId] ?? 1) - 1);
      const nextRefCounts = { ...current.unreadRefCounts };
      if (remaining === 0) {
        delete nextRefCounts[workspaceId];
      } else {
        nextRefCounts[workspaceId] = remaining;
      }
      set({ unreadRefCounts: nextRefCounts });

      if (remaining === 0 && Object.keys(nextRefCounts).length === 0 && current.unreadPollTimer) {
        clearInterval(current.unreadPollTimer);
        detachGlobalListeners();
        set({ unreadPollTimer: null, unreadPollWorkspaceId: null });
      }
    };
  },

  subscribeRecent: (workspaceId, limit) => {
    const key = recentKey(workspaceId, limit);
    const nextCount = (get().recentRefCounts[key] ?? 0) + 1;
    set((s) => ({
      recentRefCounts: { ...s.recentRefCounts, [key]: nextCount }
    }));

    if (get().recentByWorkspace[key] === undefined) {
      void get().refreshRecent(workspaceId, limit);
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
  }
}));
