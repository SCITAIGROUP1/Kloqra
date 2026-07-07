import { forceDisconnectNotificationSocket } from "../realtime/notification-socket-manager";
import { useSessionStore } from "../stores/session.store";
import { cancelAuthRefreshRetries, cancelPlatformAuthRefreshRetries } from "./auth-refresh-guard";
import type { SessionBoundaryReason } from "./session-boundary";
import { cancelProactiveRefresh } from "./token-scheduler";

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app";

export type ForceAuthSignOutOptions = {
  reason?: SessionBoundaryReason;
  /** Navigate to login when true (default). */
  redirect?: boolean;
  redirectPath?: string;
  redirectQuery?: string;
};

let tenantSigningOut = false;
let platformSigningOut = false;

function loginPath(scope: "tenant" | "platform"): string {
  return scope === "platform" ? "/login" : "/login";
}

function redirectToLogin(scope: "tenant" | "platform", options: ForceAuthSignOutOptions): void {
  if (options.redirect === false || typeof window === "undefined") return;
  const base = options.redirectPath ?? loginPath(scope);
  const path = options.redirectQuery ? `${base}?${options.redirectQuery}` : base;
  if (!window.location.pathname.startsWith(base)) {
    window.location.assign(path);
  }
}

/** End tenant session locally: stop timers/sockets, clear stores, optional login redirect. */
export function forceTenantAuthSignOut(options: ForceAuthSignOutOptions = {}): void {
  if (tenantSigningOut) return;
  tenantSigningOut = true;
  try {
    cancelProactiveRefresh();
    cancelAuthRefreshRetries();
    forceDisconnectNotificationSocket();
    useSessionStore.getState().clear({ boundaryReason: options.reason ?? "auth_failure" });
    redirectToLogin("tenant", options);
  } finally {
    tenantSigningOut = false;
  }
}

/** End platform session locally: stop timers, clear stores, optional login redirect. */
export async function forcePlatformAuthSignOut(
  options: ForceAuthSignOutOptions = {}
): Promise<void> {
  if (platformSigningOut) return;
  platformSigningOut = true;
  try {
    cancelPlatformAuthRefreshRetries();
    const [notifications, profile, platformSession] = await Promise.all([
      import("../stores/platform-notifications-store"),
      import("../stores/platform-user-profile.store"),
      import("../stores/platform-session.store")
    ]);
    notifications.usePlatformNotificationsStore.getState().clear();
    profile.usePlatformUserProfileStore.getState().clear();
    platformSession.usePlatformSessionStore
      .getState()
      .clear({ boundaryReason: options.reason ?? "auth_failure" });
    redirectToLogin("platform", options);
  } finally {
    platformSigningOut = false;
  }
}

export function forceAuthSignOutForScope(options: ForceAuthSignOutOptions = {}): void {
  if (AUTH_SCOPE === "platform") {
    void forcePlatformAuthSignOut(options);
    return;
  }
  forceTenantAuthSignOut(options);
}
