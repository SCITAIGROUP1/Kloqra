import { ROUTES } from "@kloqra/contracts";
import type { PlatformSessionDto } from "@kloqra/contracts";
import { getApiBase } from "../api/base";
import { getPlatformRefreshToken, usePlatformSessionStore } from "../stores/platform-session.store";
import { type AuthErrorBody, isFatalAuthResponse } from "./auth-fatal-reasons";
import {
  cancelPlatformAuthRefreshRetries,
  resetPlatformAuthRefreshRetryCount,
  schedulePlatformAuthRefreshRetry
} from "./auth-refresh-guard";
import { forcePlatformAuthSignOut } from "./force-auth-sign-out";

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "platform";

let refreshPromise: Promise<string | null> | null = null;

function endPlatformSessionAfterAuthFailure(): void {
  forcePlatformAuthSignOut({
    reason: "auth_failure",
    redirectQuery: "reason=session-ended"
  });
}

async function parseResponseBody(res: Response): Promise<AuthErrorBody | undefined> {
  try {
    return (await res.json()) as AuthErrorBody;
  } catch {
    return undefined;
  }
}

async function performPlatformRefresh(): Promise<string | null> {
  const storedRefresh = getPlatformRefreshToken();
  try {
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
      const body = await parseResponseBody(res);
      if (isFatalAuthResponse(res.status, body)) {
        endPlatformSessionAfterAuthFailure();
        return null;
      }
      schedulePlatformAuthRefreshRetry(
        () => void tryRefreshPlatformSession(),
        endPlatformSessionAfterAuthFailure
      );
      return null;
    }

    const body = (await res.json()) as PlatformSessionDto & {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!body.accessToken) {
      endPlatformSessionAfterAuthFailure();
      return null;
    }
    usePlatformSessionStore.getState().setSession(body, body.accessToken, body.refreshToken);
    resetPlatformAuthRefreshRetryCount();
    return body.accessToken;
  } catch {
    schedulePlatformAuthRefreshRetry(
      () => void tryRefreshPlatformSession(),
      endPlatformSessionAfterAuthFailure
    );
    return null;
  }
}

export async function tryRefreshPlatformSession(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = performPlatformRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export { cancelPlatformAuthRefreshRetries };
