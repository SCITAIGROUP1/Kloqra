import type { PlatformSessionDto } from "@kloqra/contracts";
import { create } from "zustand";
import { scheduleProactiveRefresh, cancelProactiveRefresh } from "../auth/token-scheduler";

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "platform";

function tokenKey() {
  return `cm-${AUTH_SCOPE}-access-token`;
}

function refreshTokenKey() {
  return `cm-${AUTH_SCOPE}-refresh-token`;
}

interface PlatformSessionState {
  session: PlatformSessionDto | null;
  accessToken: string | null;
  setSession: (session: PlatformSessionDto, accessToken: string, refreshToken?: string) => void;
  clear: () => void;
}

export const usePlatformSessionStore = create<PlatformSessionState>((set) => ({
  session: null,
  accessToken: null,
  setSession: (session, accessToken, refreshToken) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(tokenKey(), accessToken);
      if (refreshToken) {
        localStorage.setItem(refreshTokenKey(), refreshToken);
      }
      scheduleProactiveRefresh(accessToken);
    }
    set({ session, accessToken });
  },
  clear: () => {
    if (typeof window !== "undefined") {
      cancelProactiveRefresh();
      localStorage.removeItem(tokenKey());
      localStorage.removeItem(refreshTokenKey());
    }
    set({ session: null, accessToken: null });
  }
}));

export function getPlatformAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(tokenKey());
}

export function getPlatformRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(refreshTokenKey());
}
