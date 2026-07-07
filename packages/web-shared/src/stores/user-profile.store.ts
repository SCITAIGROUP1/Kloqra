"use client";

import { ROUTES, type UserProfileDto } from "@kloqra/contracts";
import { create } from "zustand";
import { api } from "../api/client";
import { profileApiOptions } from "../features/account/profile-cache-key";

type ProfileEntry = {
  profile: UserProfileDto | null;
  loading: boolean;
};

type UserProfileStoreState = {
  byWorkspace: Record<string, ProfileEntry>;
  refCounts: Record<string, number>;

  refresh: (workspaceId: string) => Promise<UserProfileDto | null>;
  setProfile: (workspaceId: string, profile: UserProfileDto) => void;
  subscribe: (workspaceId: string) => () => void;
  clear: () => void;
};

export const useUserProfileStore = create<UserProfileStoreState>((set, get) => ({
  byWorkspace: {},
  refCounts: {},

  clear: () => set({ byWorkspace: {}, refCounts: {} }),

  refresh: async (workspaceId) => {
    if (!workspaceId) return null;
    set((state) => ({
      byWorkspace: {
        ...state.byWorkspace,
        [workspaceId]: {
          profile: state.byWorkspace[workspaceId]?.profile ?? null,
          loading: true
        }
      }
    }));
    try {
      const profile = await api<UserProfileDto>(ROUTES.USERS.ME, profileApiOptions(workspaceId));
      set((state) => ({
        byWorkspace: {
          ...state.byWorkspace,
          [workspaceId]: { profile, loading: false }
        }
      }));
      return profile;
    } catch {
      set((state) => ({
        byWorkspace: {
          ...state.byWorkspace,
          [workspaceId]: { profile: null, loading: false }
        }
      }));
      return null;
    }
  },

  setProfile: (workspaceId, profile) => {
    set((state) => ({
      byWorkspace: {
        ...state.byWorkspace,
        [workspaceId]: { profile, loading: false }
      }
    }));
  },

  subscribe: (workspaceId) => {
    const nextCount = (get().refCounts[workspaceId] ?? 0) + 1;
    set((s) => ({ refCounts: { ...s.refCounts, [workspaceId]: nextCount } }));

    if (get().byWorkspace[workspaceId] === undefined) {
      void get().refresh(workspaceId);
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

export async function fetchUserProfile(workspaceId: string): Promise<UserProfileDto | null> {
  const state = useUserProfileStore.getState();
  const cached = state.byWorkspace[workspaceId]?.profile;
  if (cached) return cached;
  return state.refresh(workspaceId);
}
