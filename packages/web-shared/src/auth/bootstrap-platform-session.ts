import { ROUTES } from "@kloqra/contracts";
import type { PlatformSessionDto } from "@kloqra/contracts";
import { getApiBase } from "../api/base";
import { clearThemeHydration } from "../hooks/theme-preference-state";
import { clearStoredThemePreference } from "../hooks/theme-storage";
import {
  getPlatformAccessToken,
  getPlatformRefreshToken,
  usePlatformSessionStore
} from "../stores/platform-session.store";
import { isAccessTokenExpired } from "./jwt-payload";

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "platform";

let refreshPromise: Promise<string | null> | null = null;

async function performPlatformRefresh(): Promise<string | null> {
  const storedRefresh = getPlatformRefreshToken();
  const res = await fetch(`${getApiBase()}${ROUTES.AUTH.REFRESH}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Scope": AUTH_SCOPE
    },
    body: JSON.stringify(storedRefresh ? { refreshToken: storedRefresh } : {})
  });
  if (!res.ok) return null;
  const body = (await res.json()) as PlatformSessionDto & {
    accessToken?: string;
    refreshToken?: string;
  };
  if (!body.accessToken) return null;
  usePlatformSessionStore.getState().setSession(body, body.accessToken, body.refreshToken);
  return body.accessToken;
}

export async function tryRefreshPlatformSession(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = performPlatformRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function fetchPlatformMe(token: string): Promise<PlatformSessionDto> {
  const res = await fetch(`${getApiBase()}${ROUTES.AUTH.ME}`, {
    credentials: "include",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Auth-Scope": AUTH_SCOPE
    }
  });
  if (!res.ok) throw new Error("Not authenticated");
  return (await res.json()) as PlatformSessionDto;
}

export type BootstrapPlatformResult = { ok: true; session: PlatformSessionDto } | { ok: false };

export async function bootstrapPlatformSession(): Promise<BootstrapPlatformResult> {
  let token = getPlatformAccessToken();
  if (!token || isAccessTokenExpired(token)) {
    token = await tryRefreshPlatformSession();
    if (!token) return { ok: false };
  }

  try {
    const session = await fetchPlatformMe(token);
    usePlatformSessionStore.getState().setSession(session, token);
    return { ok: true, session };
  } catch {
    return { ok: false };
  }
}

export async function logoutPlatformSession(): Promise<void> {
  const userId = usePlatformSessionStore.getState().session?.user.id;
  try {
    await fetch(`${getApiBase()}${ROUTES.AUTH.LOGOUT}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "X-Auth-Scope": AUTH_SCOPE }
    });
  } catch {
    /* clear local state regardless */
  }
  clearStoredThemePreference(userId);
  clearThemeHydration();
  usePlatformSessionStore.getState().clear();
}
