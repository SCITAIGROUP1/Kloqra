"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  ActiveTimerDto,
  AutoStoppedTimerDto,
  ListTimesheetSubmissionsResponseDto,
  MyWeekSummaryDto,
  TimesheetPeriodDto
} from "@kloqra/contracts";
import { create } from "zustand";
import { api } from "@/lib/api";
import { normalizeActiveTimer, useTimerStore } from "@/stores/timer.store";

export function buildSubmissionsPath(query?: URLSearchParams) {
  const qs = query?.toString();
  return qs ? `${ROUTES.TIMESHEETS.MY_SUBMISSIONS}?${qs}` : ROUTES.TIMESHEETS.MY_SUBMISSIONS;
}

type SubmissionsEntry = {
  items: TimesheetPeriodDto[];
  loading: boolean;
};

type MemberReportingStoreState = {
  weekSummaryByWorkspace: Record<string, { summary: MyWeekSummaryDto | null; loading: boolean }>;
  weekSummaryRefCounts: Record<string, number>;

  refreshWeekSummary: (workspaceId: string) => Promise<void>;
  subscribeWeekSummary: (workspaceId: string) => () => void;
};

export const useMemberReportingStore = create<MemberReportingStoreState>((set, get) => ({
  weekSummaryByWorkspace: {},
  weekSummaryRefCounts: {},

  refreshWeekSummary: async (workspaceId) => {
    if (!workspaceId) return;
    set((state) => ({
      weekSummaryByWorkspace: {
        ...state.weekSummaryByWorkspace,
        [workspaceId]: {
          summary: state.weekSummaryByWorkspace[workspaceId]?.summary ?? null,
          loading: true
        }
      }
    }));
    try {
      const summary = await api<MyWeekSummaryDto>(ROUTES.REPORTING.ME, { workspaceId });
      set((state) => ({
        weekSummaryByWorkspace: {
          ...state.weekSummaryByWorkspace,
          [workspaceId]: { summary, loading: false }
        }
      }));
    } catch {
      set((state) => ({
        weekSummaryByWorkspace: {
          ...state.weekSummaryByWorkspace,
          [workspaceId]: { summary: null, loading: false }
        }
      }));
    }
  },

  subscribeWeekSummary: (workspaceId) => {
    const nextCount = (get().weekSummaryRefCounts[workspaceId] ?? 0) + 1;
    set((s) => ({
      weekSummaryRefCounts: { ...s.weekSummaryRefCounts, [workspaceId]: nextCount }
    }));

    if (get().weekSummaryByWorkspace[workspaceId] === undefined) {
      void get().refreshWeekSummary(workspaceId);
    }

    return () => {
      const remaining = Math.max(0, (get().weekSummaryRefCounts[workspaceId] ?? 1) - 1);
      const nextRefCounts = { ...get().weekSummaryRefCounts };
      if (remaining === 0) {
        delete nextRefCounts[workspaceId];
      } else {
        nextRefCounts[workspaceId] = remaining;
      }
      set({ weekSummaryRefCounts: nextRefCounts });
    };
  }
}));

type ActiveTimerStoreState = {
  refCounts: Record<string, number>;
  initialized: Record<string, boolean>;
  refreshActive: (workspaceId: string) => Promise<void>;
  subscribeActive: (workspaceId: string) => () => void;
};

export const useActiveTimerSessionStore = create<ActiveTimerStoreState>((set, get) => ({
  refCounts: {},
  initialized: {},

  refreshActive: async (workspaceId) => {
    if (!workspaceId) return;
    try {
      const res = await api<ActiveTimerDto | AutoStoppedTimerDto | null>(ROUTES.TIMER.ACTIVE, {
        workspaceId
      });
      const active =
        res && "autostopped" in res && res.autostopped
          ? null
          : normalizeActiveTimer(res as ActiveTimerDto | null);
      useTimerStore.getState().setActive(active);
    } catch {
      useTimerStore.getState().setActive(null);
    } finally {
      set((state) => ({
        initialized: { ...state.initialized, [workspaceId]: true }
      }));
    }
  },

  subscribeActive: (workspaceId) => {
    const nextCount = (get().refCounts[workspaceId] ?? 0) + 1;
    set((s) => ({ refCounts: { ...s.refCounts, [workspaceId]: nextCount } }));

    if (!get().initialized[workspaceId]) {
      void get().refreshActive(workspaceId);
    }

    return () => {
      const remaining = Math.max(0, (get().refCounts[workspaceId] ?? 1) - 1);
      const nextRefCounts = { ...get().refCounts };
      if (remaining === 0) {
        delete nextRefCounts[workspaceId];
      } else {
        nextRefCounts[workspaceId] = remaining;
      }
      set({ refCounts: nextRefCounts });
    };
  }
}));

export const EMPTY_SUBMISSIONS: TimesheetPeriodDto[] = [];

type MySubmissionsStoreState = {
  byKey: Record<string, SubmissionsEntry>;
  refCounts: Record<string, number>;

  fetchSubmissions: (workspaceId: string, queryKey: string, path: string) => Promise<void>;
  subscribe: (workspaceId: string, queryKey: string, path: string) => () => void;
  invalidate: (workspaceId: string) => void;
};

export const useMySubmissionsStore = create<MySubmissionsStoreState>((set, get) => ({
  byKey: {},
  refCounts: {},

  fetchSubmissions: async (workspaceId, queryKey, path) => {
    if (!workspaceId) return;
    const key = `${workspaceId}:${queryKey}`;
    set((state) => ({
      byKey: {
        ...state.byKey,
        [key]: {
          items: state.byKey[key]?.items ?? EMPTY_SUBMISSIONS,
          loading: true
        }
      }
    }));
    try {
      const res = await api<ListTimesheetSubmissionsResponseDto>(path, { workspaceId });
      set((state) => ({
        byKey: {
          ...state.byKey,
          [key]: { items: res.items ?? EMPTY_SUBMISSIONS, loading: false }
        }
      }));
    } catch {
      set((state) => ({
        byKey: {
          ...state.byKey,
          [key]: { items: EMPTY_SUBMISSIONS, loading: false }
        }
      }));
    }
  },

  subscribe: (workspaceId, queryKey, path) => {
    const key = `${workspaceId}:${queryKey}`;
    const nextCount = (get().refCounts[key] ?? 0) + 1;
    set((s) => ({ refCounts: { ...s.refCounts, [key]: nextCount } }));

    if (get().byKey[key] === undefined) {
      void get().fetchSubmissions(workspaceId, queryKey, path);
    }

    return () => {
      const remaining = Math.max(0, (get().refCounts[key] ?? 1) - 1);
      const nextRefCounts = { ...get().refCounts };
      if (remaining === 0) {
        delete nextRefCounts[key];
      } else {
        nextRefCounts[key] = remaining;
      }
      set({ refCounts: nextRefCounts });
    };
  },

  invalidate: (workspaceId) => {
    set((state) => {
      const nextByKey = { ...state.byKey };
      const nextRefCounts = { ...state.refCounts };
      for (const key of Object.keys(nextByKey)) {
        if (key.startsWith(`${workspaceId}:`)) {
          delete nextByKey[key];
          delete nextRefCounts[key];
        }
      }
      return { byKey: nextByKey, refCounts: nextRefCounts };
    });
  }
}));
