import { ROUTES } from "@kloqra/contracts";
import type { PlatformSessionDto } from "@kloqra/contracts";
import { getApiBase } from "../api/base";
import { clearThemeHydration } from "../hooks/theme-preference-state";
import { clearStoredThemePreference } from "../hooks/theme-storage";
import { usePlatformNotificationsStore } from "../stores/platform-notifications-store";
import { getPlatformAccessToken, usePlatformSessionStore } from "../stores/platform-session.store";
import { usePlatformUserProfileStore } from "../stores/platform-user-profile.store";
import { establishPlatformSession } from "./establish-tenant-session";
import { isAccessTokenExpired } from "./jwt-payload";
import { beginLogout, isLogoutEpochCurrent } from "./logout-session";
import { tryRefreshPlatformSession } from "./refresh-platform-session";

export { tryRefreshPlatformSession } from "./refresh-platform-session";

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "platform";

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
    establishPlatformSession(session, token);
    return { ok: true, session };
  } catch {
    return { ok: false };
  }
}

export async function logoutPlatformSession(): Promise<void> {
  const epoch = beginLogout();
  const userId = usePlatformSessionStore.getState().session?.user.id;

  clearStoredThemePreference(userId);
  clearThemeHydration();
  usePlatformNotificationsStore.getState().clear();
  usePlatformUserProfileStore.getState().clear();
  usePlatformSessionStore.getState().clear({ boundaryReason: "logout" });

  void fetch(`${getApiBase()}${ROUTES.AUTH.LOGOUT}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Scope": AUTH_SCOPE
    }
  }).catch(() => {
    /* Best-effort server revoke; local session is already cleared */
  });

  if (typeof window !== "undefined" && isLogoutEpochCurrent(epoch)) {
    window.location.assign("/login");
  }
}
