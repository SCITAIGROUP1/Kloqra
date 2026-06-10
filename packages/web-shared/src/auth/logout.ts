import { ROUTES } from "@kloqra/contracts";
import { api } from "../api/client";
import { useSessionStore } from "../stores/session.store";

/** Clears httpOnly API cookies (shared across client + admin) and this app's local session. */
export async function logoutSession(workspaceId?: string | null): Promise<void> {
  try {
    await api(ROUTES.AUTH.LOGOUT, {
      method: "DELETE",
      ...(workspaceId ? { workspaceId } : {})
    });
  } catch {
    /* Always clear local state even if the API is unreachable */
  }
  useSessionStore.getState().clear();
}
