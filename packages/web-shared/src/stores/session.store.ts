import type { AuthSessionDto } from "@kloqra/contracts";
import { create } from "zustand";

/** Per-app scope (e.g. `client` / `admin`) so tokens are not mixed on the same origin. */
const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app";

function tokenKey() {
  return `cm-${AUTH_SCOPE}-access-token`;
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
  setSession: (session: AuthSessionDto, accessToken: string) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  accessToken: null,
  setSession: (session, accessToken) => {
    if (typeof window !== "undefined") {
      migrateLegacyStorage();
      localStorage.setItem(tokenKey(), accessToken);
      localStorage.setItem(workspaceKey(), session.workspaceId);
    }
    set({ session, accessToken });
  },
  clear: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(tokenKey());
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
