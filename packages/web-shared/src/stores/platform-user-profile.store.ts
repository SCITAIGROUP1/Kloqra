"use client";

import { ROUTES, type PlatformUserProfileDto } from "@kloqra/contracts";
import { create } from "zustand";
import { api } from "../api/client";

type ProfileEntry = {
  profile: PlatformUserProfileDto | null;
  loading: boolean;
};

type PlatformUserProfileStoreState = {
  profile: ProfileEntry;
  refCount: number;
  refresh: () => Promise<PlatformUserProfileDto | null>;
  setProfile: (profile: PlatformUserProfileDto) => void;
  subscribe: () => () => void;
  clear: () => void;
};

export const usePlatformUserProfileStore = create<PlatformUserProfileStoreState>((set, get) => ({
  profile: { profile: null, loading: false },
  refCount: 0,

  refresh: async () => {
    set({ profile: { profile: get().profile.profile, loading: true } });
    try {
      const profile = await api<PlatformUserProfileDto>(ROUTES.PLATFORM.ME);
      set({ profile: { profile, loading: false } });
      return profile;
    } catch {
      set({ profile: { profile: null, loading: false } });
      return null;
    }
  },

  setProfile: (profile) => {
    set({ profile: { profile, loading: false } });
  },

  subscribe: () => {
    set({ refCount: get().refCount + 1 });
    if (get().profile.profile === null && !get().profile.loading) {
      void get().refresh();
    }
    return () => {
      set({ refCount: Math.max(0, get().refCount - 1) });
    };
  },

  clear: () => set({ profile: { profile: null, loading: false }, refCount: 0 })
}));
