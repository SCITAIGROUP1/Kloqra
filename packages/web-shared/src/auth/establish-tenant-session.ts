import type { AuthSessionDto, PlatformSessionDto } from "@kloqra/contracts";
import { getPlatformAccessToken, usePlatformSessionStore } from "../stores/platform-session.store";
import { getAccessToken, useSessionStore } from "../stores/session.store";
import { invalidateAuthRefresh } from "./auth-refresh-guard";
import { invalidatePendingLogout } from "./logout-session";

/**
 * Replace the tenant session after login or impersonation handoff.
 * Always runs a full boundary when replacing an existing session or token.
 */
export function establishTenantSession(
  session: AuthSessionDto,
  accessToken: string,
  refreshToken?: string
): void {
  invalidatePendingLogout();
  invalidateAuthRefresh();
  const store = useSessionStore.getState();
  if (store.session || getAccessToken()) {
    store.clear({ boundaryReason: "login" });
  }
  store.setSession(session, accessToken, refreshToken, { boundaryReason: "login" });
}

/** Replace the platform session after login, clearing any prior platform user state. */
export function establishPlatformSession(
  session: PlatformSessionDto,
  accessToken: string,
  refreshToken?: string
): void {
  invalidatePendingLogout();
  const store = usePlatformSessionStore.getState();
  if (store.session || getPlatformAccessToken()) {
    store.clear({ boundaryReason: "login" });
  }
  store.setSession(session, accessToken, refreshToken, { boundaryReason: "login" });
}
