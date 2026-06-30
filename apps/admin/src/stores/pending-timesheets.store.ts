"use client";

import {
  ROUTES,
  type ListPendingTimesheetsResponseDto,
  type PendingTimesheetDto,
  type TimesheetApprovalsFilterQuery
} from "@kloqra/contracts";
import { buildApprovalsFilterQueryString } from "@kloqra/web-shared";
import { create } from "zustand";
import { api } from "@/lib/api";

const POLL_MS = 60_000;
export const EMPTY_PENDING_TIMESHEETS: PendingTimesheetDto[] = [];

type PendingEntry = {
  items: PendingTimesheetDto[];
  loading: boolean;
  error: boolean;
};

type PendingTimesheetsStoreState = {
  byKey: Record<string, PendingEntry>;
  refCounts: Record<string, number>;
  pollTimer: ReturnType<typeof setInterval> | null;
  pollKey: string | null;

  fetchPending: (workspaceId: string, filterKey: string) => Promise<void>;
  subscribe: (workspaceId: string, filterKey: string) => () => void;
  removeItem: (workspaceId: string, filterKey: string, id: string) => void;
  refreshWorkspace: (workspaceId: string) => void;
};

function cacheKey(workspaceId: string, filterKey: string) {
  return `${workspaceId}:${filterKey}`;
}

function buildPendingPath(filterKey: string) {
  return filterKey
    ? `${ROUTES.TIMESHEETS.LIST_PENDING}?${filterKey}`
    : ROUTES.TIMESHEETS.LIST_PENDING;
}

export const usePendingTimesheetsStore = create<PendingTimesheetsStoreState>((set, get) => ({
  byKey: {},
  refCounts: {},
  pollTimer: null,
  pollKey: null,

  fetchPending: async (workspaceId, filterKey) => {
    if (!workspaceId) return;
    const key = cacheKey(workspaceId, filterKey);
    set((state) => ({
      byKey: {
        ...state.byKey,
        [key]: {
          items: state.byKey[key]?.items ?? [],
          loading: true,
          error: false
        }
      }
    }));
    try {
      const data = await api<ListPendingTimesheetsResponseDto>(buildPendingPath(filterKey), {
        workspaceId
      });
      set((state) => ({
        byKey: {
          ...state.byKey,
          [key]: { items: data.items ?? [], loading: false, error: false }
        }
      }));
    } catch {
      set((state) => ({
        byKey: {
          ...state.byKey,
          [key]: { items: [], loading: false, error: true }
        }
      }));
    }
  },

  subscribe: (workspaceId, filterKey) => {
    const key = cacheKey(workspaceId, filterKey);
    const nextCount = (get().refCounts[key] ?? 0) + 1;
    set((s) => ({ refCounts: { ...s.refCounts, [key]: nextCount } }));

    void get().fetchPending(workspaceId, filterKey);

    const shouldPoll = filterKey === "";
    if (shouldPoll && !get().pollTimer) {
      const timer = setInterval(() => void get().fetchPending(workspaceId, filterKey), POLL_MS);
      set({ pollTimer: timer, pollKey: key });
    }

    return () => {
      const current = get();
      const remaining = Math.max(0, (current.refCounts[key] ?? 1) - 1);
      const nextRefCounts = { ...current.refCounts };
      if (remaining === 0) {
        delete nextRefCounts[key];
      } else {
        nextRefCounts[key] = remaining;
      }
      set({ refCounts: nextRefCounts });

      if (remaining === 0 && current.pollKey === key && current.pollTimer) {
        clearInterval(current.pollTimer);
        set({ pollTimer: null, pollKey: null });
      }
    };
  },

  removeItem: (workspaceId, filterKey, id) => {
    const key = cacheKey(workspaceId, filterKey);
    set((state) => {
      const entry = state.byKey[key];
      if (!entry) return state;
      return {
        byKey: {
          ...state.byKey,
          [key]: { ...entry, items: entry.items.filter((item) => item.id !== id) }
        }
      };
    });
  },

  refreshWorkspace: (workspaceId) => {
    const state = get();
    for (const key of Object.keys(state.refCounts)) {
      if (!key.startsWith(`${workspaceId}:`)) continue;
      if ((state.refCounts[key] ?? 0) <= 0) continue;
      const filterKey = key.slice(workspaceId.length + 1);
      void get().fetchPending(workspaceId, filterKey);
    }
  }
}));

export function usePendingTimesheetsListKey(
  workspaceId: string,
  filters: TimesheetApprovalsFilterQuery
) {
  return cacheKey(workspaceId, buildApprovalsFilterQueryString(filters));
}
