"use client";

import { useEffect } from "react";
import { forceTenantAuthSignOut } from "../auth/force-auth-sign-out";
import { readUserIdFromToken } from "../auth/jwt-payload";
import { syncSessionFromStoredToken } from "../auth/session-token-reconcile";
import { getAccessToken, useSessionStore } from "../stores/session.store";

/**
 * Incognito back/forward cache can restore a frozen React tree from a prior user.
 * Reconcile persisted pages against the current stored session token.
 */
export function useBfCacheSessionReconcile(): void {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted || typeof window === "undefined") return;

      const session = useSessionStore.getState().session;
      const tokenUserId = readUserIdFromToken(getAccessToken());
      if (!session || !tokenUserId) return;
      if (session.user.id === tokenUserId) return;

      void syncSessionFromStoredToken().then((ok) => {
        if (!ok) {
          forceTenantAuthSignOut({
            reason: "auth_failure",
            redirectQuery: "reason=session-ended"
          });
        }
      });
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
}
