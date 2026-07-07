"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  ActiveTimerDto,
  AutoStoppedTimerDto,
  ListTimesheetSubmissionsResponseDto,
  MyWeekSummaryDto,
  TimesheetPeriodDto
} from "@kloqra/contracts";
import { invalidateTimelogData } from "@kloqra/web-shared";
import { create } from "zustand";
import {
  memberStoreKey,
  memberStoreKeysForWorkspace,
  workspaceIdFromMemberStoreKey
} from "./member-store-cache-key";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";
import { normalizeActiveTimer, useTimerStore } from "@/stores/timer.store";

export function buildSubmissionsPath(query?: URLSearchParams) {
  const qs = query?.toString();
  return qs ? `${ROUTES.TIMESHEETS.MY_SUBMISSIONS}?${qs}` : ROUTES.TIMESHEETS.MY_SUBMISSIONS;
}

function resolveMemberUserId(): string | null {
  return useSessionStore.getState().session?.user?.id ?? null;
}

function pathForSubmissionQueryKey(queryKey: string): string {
  if (queryKey === "all") return buildSubmissionsPath();
  return buildSubmissionsPath(new URLSearchParams(queryKey));
}

function parseSubmissionStoreKey(
  key: string
): { userId: string; workspaceId: string; queryKey: string } | null {
  const parts = key.split(":");
  if (parts.length < 3) return null;
  const userId = parts[0];
  const workspaceId = parts[1];
  const queryKey = parts.slice(2).join(":");
  if (!userId || !workspaceId || !queryKey) return null;
  return { userId, workspaceId, queryKey };
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
  invalidateWeekSummary: (workspaceId: string) => void;
  removeWorkspace: (workspaceId: string) => void;
  clear: () => void;
};

export const useMemberReportingStore = create<MemberReportingStoreState>((set, get) => ({
  weekSummaryByWorkspace: {},
  weekSummaryRefCounts: {},

  refreshWeekSummary: async (workspaceId) => {
    const userId = resolveMemberUserId();
    if (!workspaceId || !userId) return;
    const key = memberStoreKey(userId, workspaceId);
    set((state) => ({
      weekSummaryByWorkspace: {
        ...state.weekSummaryByWorkspace,
        [key]: {
          summary: state.weekSummaryByWorkspace[key]?.summary ?? null,
          loading: true
        }
      }
    }));
    try {
      const summary = await api<MyWeekSummaryDto>(ROUTES.REPORTING.ME, { workspaceId });
      const activeUserId = resolveMemberUserId();
      if (activeUserId !== userId) return;
      set((state) => ({
        weekSummaryByWorkspace: {
          ...state.weekSummaryByWorkspace,
          [key]: { summary, loading: false }
        }
      }));
    } catch {
      set((state) => ({
        weekSummaryByWorkspace: {
          ...state.weekSummaryByWorkspace,
          [key]: { summary: null, loading: false }
        }
      }));
    }
  },

  subscribeWeekSummary: (workspaceId) => {
    const userId = resolveMemberUserId();
    if (!userId || !workspaceId) return () => undefined;

    const key = memberStoreKey(userId, workspaceId);
    const nextCount = (get().weekSummaryRefCounts[key] ?? 0) + 1;
    set((s) => ({
      weekSummaryRefCounts: { ...s.weekSummaryRefCounts, [key]: nextCount }
    }));

    const cached = get().weekSummaryByWorkspace[key];
    if (cached === undefined) {
      void get().refreshWeekSummary(workspaceId);
    }

    return () => {
      const remaining = Math.max(0, (get().weekSummaryRefCounts[key] ?? 1) - 1);
      const nextRefCounts = { ...get().weekSummaryRefCounts };
      if (remaining === 0) {
        delete nextRefCounts[key];
      } else {
        nextRefCounts[key] = remaining;
      }
      set({ weekSummaryRefCounts: nextRefCounts });
    };
  },

  invalidateWeekSummary: (workspaceId) => {
    const userId = resolveMemberUserId();
    if (!userId) return;
    const key = memberStoreKey(userId, workspaceId);
    set((state) => {
      const weekSummaryByWorkspace = { ...state.weekSummaryByWorkspace };
      delete weekSummaryByWorkspace[key];
      return { weekSummaryByWorkspace };
    });
    if ((get().weekSummaryRefCounts[key] ?? 0) > 0) {
      void get().refreshWeekSummary(workspaceId);
    }
  },

  removeWorkspace: (workspaceId) => {
    set((state) => {
      const weekSummaryByWorkspace = { ...state.weekSummaryByWorkspace };
      const weekSummaryRefCounts = { ...state.weekSummaryRefCounts };
      for (const key of memberStoreKeysForWorkspace(weekSummaryByWorkspace, workspaceId)) {
        delete weekSummaryByWorkspace[key];
        delete weekSummaryRefCounts[key];
      }
      return { weekSummaryByWorkspace, weekSummaryRefCounts };
    });
  },

  clear: () => set({ weekSummaryByWorkspace: {}, weekSummaryRefCounts: {} })
}));

type ActiveTimerStoreState = {
  refCounts: Record<string, number>;
  initialized: Record<string, boolean>;
  refreshActive: (workspaceId: string) => Promise<void>;
  subscribeActive: (workspaceId: string) => () => void;
  invalidateActive: (workspaceId: string) => void;
  removeWorkspace: (workspaceId: string) => void;
  clear: () => void;
};

export const useActiveTimerSessionStore = create<ActiveTimerStoreState>((set, get) => ({
  refCounts: {},
  initialized: {},

  refreshActive: async (workspaceId) => {
    const userId = resolveMemberUserId();
    if (!workspaceId || !userId) return;
    const key = memberStoreKey(userId, workspaceId);
    try {
      const res = await api<ActiveTimerDto | AutoStoppedTimerDto | null>(ROUTES.TIMER.ACTIVE, {
        workspaceId
      });
      const activeUserId = resolveMemberUserId();
      if (activeUserId !== userId) return;
      const active =
        res && "autostopped" in res && res.autostopped
          ? null
          : normalizeActiveTimer(res as ActiveTimerDto | null);
      useTimerStore.getState().setActive(active);
      if (res && "autostopped" in res && res.autostopped) {
        void invalidateTimelogData(workspaceId);
      }
    } catch {
      useTimerStore.getState().setActive(null);
    } finally {
      set((state) => ({
        initialized: { ...state.initialized, [key]: true }
      }));
    }
  },

  subscribeActive: (workspaceId) => {
    const userId = resolveMemberUserId();
    if (!userId || !workspaceId) return () => undefined;

    const key = memberStoreKey(userId, workspaceId);
    const nextCount = (get().refCounts[key] ?? 0) + 1;
    set((s) => ({ refCounts: { ...s.refCounts, [key]: nextCount } }));

    if (!get().initialized[key]) {
      void get().refreshActive(workspaceId);
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

  invalidateActive: (workspaceId) => {
    const userId = resolveMemberUserId();
    if (!userId) return;
    const key = memberStoreKey(userId, workspaceId);
    set((state) => {
      const initialized = { ...state.initialized };
      delete initialized[key];
      return { initialized };
    });
    if ((get().refCounts[key] ?? 0) > 0) {
      void get().refreshActive(workspaceId);
    }
  },

  removeWorkspace: (workspaceId) => {
    set((state) => {
      const initialized = { ...state.initialized };
      const refCounts = { ...state.refCounts };
      for (const key of memberStoreKeysForWorkspace(initialized, workspaceId)) {
        delete initialized[key];
        delete refCounts[key];
      }
      return { initialized, refCounts };
    });
  },

  clear: () => set({ refCounts: {}, initialized: {} })
}));

export const EMPTY_SUBMISSIONS: TimesheetPeriodDto[] = [];

type MySubmissionsStoreState = {
  byKey: Record<string, SubmissionsEntry>;
  refCounts: Record<string, number>;

  fetchSubmissions: (workspaceId: string, queryKey: string, path: string) => Promise<void>;
  subscribe: (workspaceId: string, queryKey: string, path: string) => () => void;
  invalidate: (workspaceId: string) => void;
  clear: () => void;
};

export const useMySubmissionsStore = create<MySubmissionsStoreState>((set, get) => ({
  byKey: {},
  refCounts: {},

  fetchSubmissions: async (workspaceId, queryKey, path) => {
    const userId = resolveMemberUserId();
    if (!workspaceId || !userId) return;
    const key = memberStoreKey(userId, workspaceId, queryKey);
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
      const activeUserId = resolveMemberUserId();
      if (activeUserId !== userId) return;
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
    const userId = resolveMemberUserId();
    if (!userId || !workspaceId) return () => undefined;

    const key = memberStoreKey(userId, workspaceId, queryKey);
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
    const keys = memberStoreKeysForWorkspace(get().byKey, workspaceId);
    if (keys.length === 0) return;

    set((state) => {
      const nextByKey = { ...state.byKey };
      for (const key of keys) {
        delete nextByKey[key];
      }
      return { byKey: nextByKey };
    });

    for (const key of keys) {
      if ((get().refCounts[key] ?? 0) <= 0) continue;
      const parsed = parseSubmissionStoreKey(key);
      if (!parsed) continue;
      void get().fetchSubmissions(
        parsed.workspaceId,
        parsed.queryKey,
        pathForSubmissionQueryKey(parsed.queryKey)
      );
    }
  },

  clear: () => set({ byKey: {}, refCounts: {} })
}));

/** @internal test helper */
export function submissionStoreKey(userId: string, workspaceId: string, queryKey: string): string {
  return memberStoreKey(userId, workspaceId, queryKey);
}

export { workspaceIdFromMemberStoreKey };
