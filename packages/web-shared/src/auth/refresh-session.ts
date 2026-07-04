import { ROUTES } from "@kloqra/contracts";
import type { AuthSessionDto } from "@kloqra/contracts";
import { getApiBase } from "../api/base";
import { getAccessToken, getRefreshToken, useSessionStore } from "../stores/session.store";
import { isAccessTokenExpired } from "./jwt-payload";
import { configureProactiveRefresh, scheduleProactiveRefresh } from "./token-scheduler";

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app";

/** Retry delay when a background refresh fails but the user still appears signed in. */
const REFRESH_RETRY_MS = 30_000;

let refreshPromise: Promise<string | null> | null = null;

function scheduleRefreshRetry(): void {
  if (typeof window === "undefined") return;
  if (!getAccessToken()) return;
  window.setTimeout(() => {
    void tryRefreshSession();
  }, REFRESH_RETRY_MS);
}

async function performRefresh(): Promise<string | null> {
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
    if (!res.ok) {
      scheduleRefreshRetry();
      return null;
    }
    const body = (await res.json()) as AuthSessionDto & {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!body.accessToken) {
      scheduleRefreshRetry();
      return null;
    }
    useSessionStore.getState().setSession(body, body.accessToken, body.refreshToken);
    return body.accessToken;
  } catch (error) {
    console.error("[Refresh Session] Failed to fetch token refresh:", error);
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

/** Resume proactive refresh after reload when a token is already in storage. */
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

if (typeof window !== "undefined") {
  bootstrapTokenSchedulerFromStorage();
}
