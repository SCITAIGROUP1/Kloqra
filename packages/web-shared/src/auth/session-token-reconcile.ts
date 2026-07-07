import { ROUTES, type AuthSessionDto } from "@kloqra/contracts";
import { getApiBase } from "../api/base";
import { applySessionFromPeer, getAccessToken, useSessionStore } from "../stores/session.store";
import { forceTenantAuthSignOut } from "./force-auth-sign-out";
import { readUserIdFromToken } from "./jwt-payload";

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app";

let syncPromise: Promise<boolean> | null = null;

async function performSync(): Promise<boolean> {
  const token = getAccessToken();
  if (!token) return false;

  const session = useSessionStore.getState().session;
  const tokenUserId = readUserIdFromToken(token);
  if (!tokenUserId) return false;
  if (session?.user.id === tokenUserId) return true;

  try {
    const res = await fetch(`${getApiBase()}${ROUTES.AUTH.ME}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Auth-Scope": AUTH_SCOPE
      },
      credentials: "include"
    });
    if (!res.ok) {
      forceTenantAuthSignOut({
        reason: "auth_failure",
        redirectQuery: "reason=session-ended"
      });
      return false;
    }
    const body = (await res.json()) as AuthSessionDto;
    if (body.user?.id !== tokenUserId) return false;
    applySessionFromPeer(body, token);
    return true;
  } catch {
    return false;
  }
}

/** Align in-memory session with tokens another tab wrote to shared storage. */
export function syncSessionFromStoredToken(): Promise<boolean> {
  if (syncPromise) return syncPromise;
  syncPromise = performSync().finally(() => {
    syncPromise = null;
  });
  return syncPromise;
}

export function initCrossTabSessionReconcile(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const scope = AUTH_SCOPE;
  const tokenStorageKey = `cm-${scope}-access-token`;

  const onStorage = (event: StorageEvent) => {
    if (event.key !== tokenStorageKey) return;
    if (event.newValue) {
      void syncSessionFromStoredToken();
      return;
    }
    forceTenantAuthSignOut({
      reason: "peer_sync",
      redirectQuery: "reason=session-ended"
    });
  };

  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
