"use client";

import {
  ROUTES,
  type PlatformNotificationCreatedEvent,
  type PlatformNotificationDto
} from "@kloqra/contracts";
import { create } from "zustand";
import { api } from "../api/client";

export const PLATFORM_NOTIFICATIONS_UPDATED_EVENT = "kloqra:platform-notifications-updated";

const UNREAD_POLL_MS = 60_000;

type UnreadEntry = { count: number; loading: boolean };
type RecentEntry = { items: PlatformNotificationDto[]; loading: boolean; limit: number };

type PlatformNotificationsStoreState = {
  unread: UnreadEntry;
  recentByLimit: Record<number, RecentEntry>;
  unreadRefCount: number;
  recentRefCounts: Record<number, number>;
  unreadPollTimer: ReturnType<typeof setInterval> | null;
  socketConnected: boolean;

  refreshUnread: () => Promise<void>;
  refreshRecent: (limit: number) => Promise<void>;
  setRecentItems: (
    limit: number,
    updater:
      | PlatformNotificationDto[]
      | ((prev: PlatformNotificationDto[]) => PlatformNotificationDto[])
  ) => void;
  subscribeUnread: () => () => void;
  subscribeRecent: (limit: number) => () => void;
  applyNotificationPush: (payload: PlatformNotificationCreatedEvent) => void;
  setSocketConnected: (connected: boolean) => void;
  clear: () => void;
};

export const usePlatformNotificationsStore = create<PlatformNotificationsStoreState>(
  (set, get) => ({
    unread: { count: 0, loading: false },
    recentByLimit: {},
    unreadRefCount: 0,
    recentRefCounts: {},
    unreadPollTimer: null,
    socketConnected: false,

    clear: () => {
      const timer = get().unreadPollTimer;
      if (timer) clearInterval(timer);
      set({
        unread: { count: 0, loading: false },
        recentByLimit: {},
        unreadRefCount: 0,
        recentRefCounts: {},
        unreadPollTimer: null,
        socketConnected: false
      });
    },

    refreshUnread: async () => {
      set((state) => ({ unread: { ...state.unread, loading: true } }));
      try {
        const res = await api<{ count: number }>(ROUTES.PLATFORM.NOTIFICATIONS_UNREAD_COUNT);
        set({ unread: { count: res.count, loading: false } });
      } catch {
        set((state) => ({ unread: { ...state.unread, loading: false } }));
      }
    },

    refreshRecent: async (limit) => {
      set((state) => ({
        recentByLimit: {
          ...state.recentByLimit,
          [limit]: {
            items: state.recentByLimit[limit]?.items ?? [],
            loading: true,
            limit
          }
        }
      }));
      try {
        const res = await api<{ items: PlatformNotificationDto[] }>(
          `${ROUTES.PLATFORM.NOTIFICATIONS}?page=1&limit=${limit}`
        );
        set((state) => ({
          recentByLimit: {
            ...state.recentByLimit,
            [limit]: { items: res.items, loading: false, limit }
          }
        }));
      } catch {
        set((state) => ({
          recentByLimit: {
            ...state.recentByLimit,
            [limit]: {
              items: state.recentByLimit[limit]?.items ?? [],
              loading: false,
              limit
            }
          }
        }));
      }
    },

    setRecentItems: (limit, updater) => {
      set((state) => {
        const prev = state.recentByLimit[limit]?.items ?? [];
        const items = typeof updater === "function" ? updater(prev) : updater;
        return {
          recentByLimit: {
            ...state.recentByLimit,
            [limit]: { items, loading: false, limit }
          }
        };
      });
    },

    subscribeUnread: () => {
      const next = get().unreadRefCount + 1;
      set({ unreadRefCount: next });
      if (next === 1) {
        void get().refreshUnread();
        if (!get().socketConnected && !get().unreadPollTimer) {
          const timer = setInterval(() => void get().refreshUnread(), UNREAD_POLL_MS);
          set({ unreadPollTimer: timer });
        }
      }
      return () => {
        const remaining = Math.max(0, get().unreadRefCount - 1);
        set({ unreadRefCount: remaining });
        if (remaining === 0 && get().unreadPollTimer) {
          clearInterval(get().unreadPollTimer!);
          set({ unreadPollTimer: null });
        }
      };
    },

    subscribeRecent: (limit) => {
      const next = (get().recentRefCounts[limit] ?? 0) + 1;
      set({ recentRefCounts: { ...get().recentRefCounts, [limit]: next } });
      if (next === 1) {
        void get().refreshRecent(limit);
      }
      return () => {
        const remaining = Math.max(0, (get().recentRefCounts[limit] ?? 1) - 1);
        const nextCounts = { ...get().recentRefCounts };
        if (remaining === 0) delete nextCounts[limit];
        else nextCounts[limit] = remaining;
        set({ recentRefCounts: nextCounts });
      };
    },

    applyNotificationPush: (payload) => {
      set({ unread: { count: payload.unreadCount, loading: false } });
      for (const limit of Object.keys(get().recentByLimit).map(Number)) {
        if ((get().recentRefCounts[limit] ?? 0) === 0) continue;
        get().setRecentItems(limit, (prev) => {
          const without = prev.filter((item) => item.id !== payload.notification.id);
          return [payload.notification, ...without].slice(0, limit);
        });
      }
    },

    setSocketConnected: (connected) => {
      set({ socketConnected: connected });
      if (connected && get().unreadPollTimer) {
        clearInterval(get().unreadPollTimer!);
        set({ unreadPollTimer: null });
      } else if (!connected && get().unreadRefCount > 0 && !get().unreadPollTimer) {
        const timer = setInterval(() => void get().refreshUnread(), UNREAD_POLL_MS);
        set({ unreadPollTimer: timer });
      }
    }
  })
);

export function dispatchPlatformNotificationsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PLATFORM_NOTIFICATIONS_UPDATED_EVENT));
  }
}
