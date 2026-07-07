"use client";

import { useEffect } from "react";
import { readUserIdFromToken } from "../auth/jwt-payload";
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

      useSessionStore.getState().clear({ boundaryReason: "auth_failure" });
      window.location.reload();
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
}
