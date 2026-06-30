import { ROUTES } from "@kloqra/contracts";
import { api } from "../api/client";
import { clearStoredThemePreference } from "../hooks/theme-storage";
import { forceDisconnectNotificationSocket } from "../realtime/notification-socket-manager";
import { useSessionStore } from "../stores/session.store";

/** Clears httpOnly API cookies (shared across client + admin) and this app's local session. */
export async function logoutSession(workspaceId?: string | null): Promise<void> {
  const userId = useSessionStore.getState().session?.user?.id;
  try {
    await api(ROUTES.AUTH.LOGOUT, {
      method: "DELETE",
      ...(workspaceId ? { workspaceId } : {})
    });
  } catch {
    /* Always clear local state even if the API is unreachable */
  }
  forceDisconnectNotificationSocket();
  clearStoredThemePreference(userId);
  useSessionStore.getState().clear();
}
