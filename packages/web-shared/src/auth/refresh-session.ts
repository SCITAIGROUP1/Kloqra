import { ROUTES } from "@kloqra/contracts";
import type { AuthSessionDto } from "@kloqra/contracts";
import { getApiBase } from "../api/base";
import { getAccessToken, getRefreshToken, useSessionStore } from "../stores/session.store";
import {
  getAuthRefreshGeneration,
  isAuthRefreshStale,
  onAuthRefreshInvalidated
} from "./auth-refresh-guard";
import { isAccessTokenExpired, readUserIdFromToken } from "./jwt-payload";
import { configureProactiveRefresh, scheduleProactiveRefresh } from "./token-scheduler";

export { invalidateAuthRefresh } from "./auth-refresh-guard";

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app";

/** Retry delay when a background refresh fails but the user still appears signed in. */
const REFRESH_RETRY_MS = 30_000;

let refreshPromise: Promise<string | null> | null = null;

onAuthRefreshInvalidated(() => {
  refreshPromise = null;
});

function shouldApplyRefreshSession(body: AuthSessionDto): boolean {
  const storedToken = getAccessToken();
  const currentSession = useSessionStore.getState().session;

  if (!storedToken && !currentSession) {
    return false;
  }

  const nextUserId = body.user?.id;
  if (!nextUserId) return false;

  if (currentSession && currentSession.user.id !== nextUserId) {
    return false;
  }

  const tokenUserId = readUserIdFromToken(storedToken);
  if (tokenUserId && tokenUserId !== nextUserId) {
    return false;
  }

  return true;
}

function scheduleRefreshRetry(): void {
  if (typeof window === "undefined") return;
  if (!getAccessToken()) return;
  window.setTimeout(() => {
    void tryRefreshSession();
  }, REFRESH_RETRY_MS);
}

async function performRefresh(): Promise<string | null> {
  const generation = getAuthRefreshGeneration();
  try {
    const storedRefresh = getRefreshToken();
    const res = await fetch(`${getApiBase()}${ROUTES.AUTH.REFRESH}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Scope": AUTH_SCOPE
      },
      body: JSON.stringify(storedRefresh ? { refreshToken: storedRefresh } : {})
    });
    if (isAuthRefreshStale(generation)) return null;
    if (!res.ok) {
      scheduleRefreshRetry();
      return null;
    }
    const body = (await res.json()) as AuthSessionDto & {
      accessToken?: string;
      refreshToken?: string;
    };
    if (isAuthRefreshStale(generation)) return null;
    if (!body.accessToken) {
      scheduleRefreshRetry();
      return null;
    }
    if (!shouldApplyRefreshSession(body)) {
      return null;
    }
    useSessionStore.getState().setSession(body, body.accessToken, body.refreshToken);
    return body.accessToken;
  } catch (error) {
    if (isAuthRefreshStale(generation)) return null;
    console.warn(
      "[Refresh Session] Failed to fetch token refresh (API server may be offline):",
      error instanceof Error ? error.message : error
    );
    scheduleRefreshRetry();
    return null;
  }
}

/** Silent refresh using httpOnly cookie; returns new access token or null. */
export async function tryRefreshSession(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = performRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

configureProactiveRefresh(() => tryRefreshSession());

/** Resume proactive refresh after app mount when a token is already in storage. */
export function bootstrapTokenSchedulerFromStorage(): void {
  if (typeof window === "undefined") return;
  const token = useSessionStore.getState().accessToken ?? getAccessToken();
  if (!token) return;
  if (isAccessTokenExpired(token)) {
    void tryRefreshSession();
    return;
  }
  scheduleProactiveRefresh(token);
}
