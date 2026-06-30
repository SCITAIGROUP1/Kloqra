import type { AuthSessionDto } from "@kloqra/contracts";
import { create } from "zustand";
import { broadcastSessionUpdate, subscribeSessionUpdates } from "../auth/auth-channel";
import { cancelProactiveRefresh, scheduleProactiveRefresh } from "../auth/token-scheduler";

/** Per-app scope (e.g. `client` / `admin`) so tokens are not mixed on the same origin. */
const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app";

function tokenKey() {
  return `cm-${AUTH_SCOPE}-access-token`;
}

function refreshTokenKey() {
  return `cm-${AUTH_SCOPE}-refresh-token`;
}

function workspaceKey() {
  return `cm-${AUTH_SCOPE}-workspace-id`;
}

/** Migrate legacy shared keys once per origin (pre–dual-app split). */
function migrateLegacyStorage() {
  const legacyToken = localStorage.getItem("cm-access-token");
  const legacyWs = localStorage.getItem("cm-workspace-id");
  if (legacyToken && !localStorage.getItem(tokenKey())) {
    localStorage.setItem(tokenKey(), legacyToken);
  }
  if (legacyWs && !localStorage.getItem(workspaceKey())) {
    localStorage.setItem(workspaceKey(), legacyWs);
  }
  if (legacyToken) localStorage.removeItem("cm-access-token");
  if (legacyWs) localStorage.removeItem("cm-workspace-id");
}

interface SessionState {
  session: AuthSessionDto | null;
  accessToken: string | null;
  setSession: (session: AuthSessionDto, accessToken: string, refreshToken?: string) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  accessToken: null,
  setSession: (session, accessToken, refreshToken) => {
    if (typeof window !== "undefined") {
      migrateLegacyStorage();
      localStorage.setItem(tokenKey(), accessToken);
      localStorage.setItem(workspaceKey(), session.workspaceId);
      if (refreshToken) {
        localStorage.setItem(refreshTokenKey(), refreshToken);
      }
      broadcastSessionUpdate(session, accessToken);
      scheduleProactiveRefresh(accessToken);
    }
    set({ session, accessToken });
  },
  clear: () => {
    if (typeof window !== "undefined") {
      cancelProactiveRefresh();
      localStorage.removeItem(tokenKey());
      localStorage.removeItem(refreshTokenKey());
      localStorage.removeItem(workspaceKey());
      localStorage.removeItem("cm-access-token");
      localStorage.removeItem("cm-workspace-id");
    }
    set({ session: null, accessToken: null });
  }
}));

export function getWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  migrateLegacyStorage();
  return localStorage.getItem(workspaceKey());
}

/** Align localStorage workspace with JWT after login or when another tab switched workspace. */
export function syncWorkspaceIdToStorage(workspaceId: string): void {
  if (typeof window === "undefined") return;
  migrateLegacyStorage();
  localStorage.setItem(workspaceKey(), workspaceId);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  migrateLegacyStorage();
  return localStorage.getItem(tokenKey());
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  migrateLegacyStorage();
  return localStorage.getItem(refreshTokenKey());
}

/** Sync session from other tabs without re-broadcasting. */
export function applySessionFromPeer(session: AuthSessionDto, accessToken: string): void {
  if (typeof window !== "undefined") {
    migrateLegacyStorage();
    localStorage.setItem(tokenKey(), accessToken);
    localStorage.setItem(workspaceKey(), session.workspaceId);
    scheduleProactiveRefresh(accessToken);
  }
  useSessionStore.setState({ session, accessToken });
}

if (typeof window !== "undefined") {
  subscribeSessionUpdates((session, accessToken) => {
    applySessionFromPeer(session, accessToken);
  });
}
