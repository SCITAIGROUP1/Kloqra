"use client";

import { ROUTES, type ThemePreference } from "@kloqra/contracts";
import { useTheme } from "next-themes";
import { useCallback } from "react";
import { api } from "../api/client";
import { usePlatformSessionStore } from "../stores/platform-session.store";
import { getWorkspaceId, useSessionStore } from "../stores/session.store";
import { markThemeHydrated } from "./theme-preference-state";

function isPlatformAuthScope(): boolean {
  return (process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app") === "platform";
}

/** Applies theme in the UI and persists to user preferences when authenticated. */
export function useThemePreference() {
  const { theme, setTheme } = useTheme();
  const tenantSession = useSessionStore((s) => s.session);
  const platformSession = usePlatformSessionStore((s) => s.session);
  const userId = isPlatformAuthScope() ? platformSession?.user.id : tenantSession?.user?.id;
  const workspaceId = tenantSession?.workspaceId ?? getWorkspaceId();

  const applyTheme = useCallback(
    (next: ThemePreference) => {
      setTheme(next);
      if (userId) {
        markThemeHydrated(userId);
      }
      if (isPlatformAuthScope()) {
        void api(ROUTES.PLATFORM.ME_PREFERENCES, {
          method: "PATCH",
          body: JSON.stringify({ theme: next })
        }).catch(() => undefined);
        return;
      }
      if (!workspaceId) return;
      void api(ROUTES.USERS.PREFERENCES, {
        method: "PATCH",
        workspaceId,
        body: JSON.stringify({ theme: next })
      }).catch(() => undefined);
    },
    [setTheme, userId, workspaceId]
  );

  return { theme, applyTheme };
}
