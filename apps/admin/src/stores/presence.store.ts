"use client";

import { ROUTES } from "@kloqra/contracts";
import type { PresenceSnapshotDto } from "@kloqra/contracts";
import { create } from "zustand";
import { api } from "@/lib/api";

const POLL_MS = 15_000;

type PresenceEntry = {
  snapshot: PresenceSnapshotDto | null;
  loading: boolean;
};

type PresenceStoreState = {
  byWorkspace: Record<string, PresenceEntry>;
  refCounts: Record<string, number>;
  pollTimer: ReturnType<typeof setInterval> | null;
  pollWorkspaceId: string | null;

  refresh: (workspaceId: string) => Promise<void>;
  subscribe: (workspaceId: string) => () => void;
};

export const usePresenceStore = create<PresenceStoreState>((set, get) => ({
  byWorkspace: {},
  refCounts: {},
  pollTimer: null,
  pollWorkspaceId: null,

  refresh: async (workspaceId) => {
    if (!workspaceId) return;
    set((state) => ({
      byWorkspace: {
        ...state.byWorkspace,
        [workspaceId]: {
          snapshot: state.byWorkspace[workspaceId]?.snapshot ?? null,
          loading: state.byWorkspace[workspaceId]?.snapshot == null
        }
      }
    }));
    try {
      const snapshot = await api<PresenceSnapshotDto>(ROUTES.PRESENCE.SNAPSHOT, { workspaceId });
      set((state) => ({
        byWorkspace: {
          ...state.byWorkspace,
          [workspaceId]: { snapshot, loading: false }
        }
      }));
    } catch {
      set((state) => ({
        byWorkspace: {
          ...state.byWorkspace,
          [workspaceId]: { snapshot: null, loading: false }
        }
      }));
    }
  },

  subscribe: (workspaceId) => {
    const nextCount = (get().refCounts[workspaceId] ?? 0) + 1;
    set((s) => ({ refCounts: { ...s.refCounts, [workspaceId]: nextCount } }));

    if (get().pollTimer && get().pollWorkspaceId !== workspaceId) {
      clearInterval(get().pollTimer!);
      set({ pollTimer: null, pollWorkspaceId: null });
    }

    if (get().byWorkspace[workspaceId] === undefined) {
      void get().refresh(workspaceId);
    }

    if (!get().pollTimer) {
      const timer = setInterval(() => void get().refresh(workspaceId), POLL_MS);
      set({ pollTimer: timer, pollWorkspaceId: workspaceId });
    }

    return () => {
      const current = get();
      const remaining = Math.max(0, (current.refCounts[workspaceId] ?? 1) - 1);
      const nextRefCounts = { ...current.refCounts };
      if (remaining === 0) {
        delete nextRefCounts[workspaceId];
      } else {
        nextRefCounts[workspaceId] = remaining;
      }
      set({ refCounts: nextRefCounts });

      if (remaining === 0 && Object.keys(nextRefCounts).length === 0 && current.pollTimer) {
        clearInterval(current.pollTimer);
        set({ pollTimer: null, pollWorkspaceId: null });
      }
    };
  }
}));
