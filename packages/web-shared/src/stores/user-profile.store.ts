"use client";

import { ROUTES, type UserProfileDto } from "@kloqra/contracts";
import { create } from "zustand";
import { profileApiOptions } from "../features/account/profile-cache-key";
import { useSessionStore } from "./session.store";

type ProfileEntry = {
  profile: UserProfileDto | null;
  loading: boolean;
  /** Session user id when profile was fetched — avoids serving cache after user switch. */
  userId?: string;
};

type UserProfileStoreState = {
  byWorkspace: Record<string, ProfileEntry>;
  refCounts: Record<string, number>;

  refresh: (workspaceId: string) => Promise<UserProfileDto | null>;
  setProfile: (workspaceId: string, profile: UserProfileDto) => void;
  removeKey: (workspaceId: string) => void;
  subscribe: (workspaceId: string) => () => void;
  clear: () => void;
};

export const useUserProfileStore = create<UserProfileStoreState>((set, get) => ({
  byWorkspace: {},
  refCounts: {},

  clear: () => set({ byWorkspace: {}, refCounts: {} }),

  removeKey: (workspaceId) => {
    set((state) => {
      const byWorkspace = { ...state.byWorkspace };
      delete byWorkspace[workspaceId];
      const refCounts = { ...state.refCounts };
      delete refCounts[workspaceId];
      return { byWorkspace, refCounts };
    });
  },

  refresh: async (workspaceId) => {
    if (!workspaceId) return null;
    const sessionUserId = useSessionStore.getState().session?.user?.id;
    set((state) => ({
      byWorkspace: {
        ...state.byWorkspace,
        [workspaceId]: {
          profile: state.byWorkspace[workspaceId]?.profile ?? null,
          loading: true,
          userId: sessionUserId
        }
      }
    }));
    try {
      const { api } = await import("../api/client");
      const profile = await api<UserProfileDto>(ROUTES.USERS.ME, profileApiOptions(workspaceId));
      set((state) => ({
        byWorkspace: {
          ...state.byWorkspace,
          [workspaceId]: { profile, loading: false, userId: sessionUserId }
        }
      }));
      return profile;
    } catch {
      set((state) => ({
        byWorkspace: {
          ...state.byWorkspace,
          [workspaceId]: { profile: null, loading: false, userId: sessionUserId }
        }
      }));
      return null;
    }
  },

  setProfile: (workspaceId, profile) => {
    const sessionUserId = useSessionStore.getState().session?.user?.id;
    set((state) => ({
      byWorkspace: {
        ...state.byWorkspace,
        [workspaceId]: { profile, loading: false, userId: sessionUserId }
      }
    }));
  },

  subscribe: (workspaceId) => {
    const nextCount = (get().refCounts[workspaceId] ?? 0) + 1;
    set((s) => ({ refCounts: { ...s.refCounts, [workspaceId]: nextCount } }));

    const sessionUserId = useSessionStore.getState().session?.user?.id;
    const cached = get().byWorkspace[workspaceId];
    if (!cached || cached.userId !== sessionUserId) {
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
  const entry = state.byWorkspace[workspaceId];
  const sessionUserId = useSessionStore.getState().session?.user?.id;
  if (entry?.profile && sessionUserId && entry.userId === sessionUserId) {
    return entry.profile;
  }
  return state.refresh(workspaceId);
}
