import { ROUTES } from "@kloqra/contracts";
import { api } from "../api/client";
import { clearStoredThemePreference } from "../hooks/theme-storage";
import { forceDisconnectNotificationSocket } from "../realtime/notification-socket-manager";
import { usePlatformNotificationsStore } from "../stores/platform-notifications-store";
import { usePlatformUserProfileStore } from "../stores/platform-user-profile.store";
import { getRefreshToken, useSessionStore } from "../stores/session.store";
import { beginLogout, isLogoutEpochCurrent } from "./logout-session";

/** Clears httpOnly API cookies (shared across client + admin) and this app's local session. */
export async function logoutSession(workspaceId?: string | null): Promise<void> {
  const epoch = beginLogout();
  const userId = useSessionStore.getState().session?.user?.id;
  const refreshToken = getRefreshToken() ?? undefined;

  forceDisconnectNotificationSocket();
  clearStoredThemePreference(userId);
  useSessionStore.getState().clear({ boundaryReason: "logout" });
  usePlatformUserProfileStore.getState().clear();
  usePlatformNotificationsStore.getState().clear();

  try {
    await api(ROUTES.AUTH.LOGOUT, {
      method: "DELETE",
      ...(refreshToken ? { body: JSON.stringify({ refreshToken }) } : {}),
      ...(workspaceId ? { workspaceId } : {})
    });
  } catch {
    /* Best-effort server revoke; local session is already cleared */
  }

  if (typeof window !== "undefined" && isLogoutEpochCurrent(epoch)) {
    window.location.assign("/login");
  }
}
