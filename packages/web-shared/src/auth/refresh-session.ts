import { ROUTES } from "@kloqra/contracts";
import type { AuthSessionDto } from "@kloqra/contracts";
import { getApiBase } from "../api/base";
import { getAccessToken, getRefreshToken, useSessionStore } from "../stores/session.store";
import { type AuthErrorBody, isFatalAuthResponse } from "./auth-fatal-reasons";
import {
  getAuthRefreshGeneration,
  isAuthRefreshStale,
  onAuthRefreshInvalidated,
  resetAuthRefreshRetryCount,
  scheduleAuthRefreshRetry
} from "./auth-refresh-guard";
import { forceTenantAuthSignOut } from "./force-auth-sign-out";
import { isAccessTokenExpired, readUserIdFromToken } from "./jwt-payload";
import { isLogoutInFlight } from "./logout-session";
import { configureProactiveRefresh, scheduleProactiveRefresh } from "./token-scheduler";

export { invalidateAuthRefresh, cancelAuthRefreshRetries } from "./auth-refresh-guard";

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app";

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

function endTenantSessionAfterAuthFailure(): void {
  forceTenantAuthSignOut({
    reason: "auth_failure",
    redirectQuery: "reason=session-ended"
  });
}

function scheduleTransientRefreshRetry(): void {
  scheduleAuthRefreshRetry(() => void tryRefreshSession(), endTenantSessionAfterAuthFailure);
}

async function parseResponseBody(res: Response): Promise<AuthErrorBody | undefined> {
  try {
    return (await res.json()) as AuthErrorBody;
  } catch {
    return undefined;
  }
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
      const body = await parseResponseBody(res);
      if (isFatalAuthResponse(res.status, body)) {
        endTenantSessionAfterAuthFailure();
        return null;
      }
      scheduleTransientRefreshRetry();
      return null;
    }

    const body = (await res.json()) as AuthSessionDto & {
      accessToken?: string;
      refreshToken?: string;
    };
    if (isAuthRefreshStale(generation)) return null;
    if (!body.accessToken) {
      endTenantSessionAfterAuthFailure();
      return null;
    }

    if (!shouldApplyRefreshSession(body)) {
      if (body.user?.id) {
        useSessionStore.getState().setSession(body, body.accessToken, body.refreshToken, {
          boundaryReason: "peer_sync"
        });
        resetAuthRefreshRetryCount();
        return body.accessToken;
      }
      endTenantSessionAfterAuthFailure();
      return null;
    }

    useSessionStore.getState().setSession(body, body.accessToken, body.refreshToken);
    resetAuthRefreshRetryCount();
    return body.accessToken;
  } catch (error) {
    if (isAuthRefreshStale(generation)) return null;
    console.warn(
      "[Refresh Session] Failed to fetch token refresh (API server may be offline):",
      error instanceof Error ? error.message : error
    );
    scheduleTransientRefreshRetry();
    return null;
  }
}

/** Silent refresh using httpOnly cookie; returns new access token or null. */
export async function tryRefreshSession(): Promise<string | null> {
  if (isLogoutInFlight()) return null;
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
