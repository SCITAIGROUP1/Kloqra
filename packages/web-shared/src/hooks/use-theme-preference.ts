"use client";

import { ROUTES, type ThemePreference } from "@kloqra/contracts";
import { useTheme } from "next-themes";
import { useCallback } from "react";
import { api } from "../api/client";
import { getWorkspaceId, useSessionStore } from "../stores/session.store";
import { markThemeHydrated } from "./theme-preference-state";

/** Applies theme in the UI and persists to user preferences when authenticated. */
export function useThemePreference() {
  const { theme, setTheme } = useTheme();
  const session = useSessionStore((s) => s.session);
  const workspaceId = session?.workspaceId ?? getWorkspaceId();

  const applyTheme = useCallback(
    (next: ThemePreference) => {
      setTheme(next);
      if (session?.user?.id) {
        markThemeHydrated(session.user.id);
      }
      if (!workspaceId) return;
      void api(ROUTES.USERS.PREFERENCES, {
        method: "PATCH",
        workspaceId,
        body: JSON.stringify({ theme: next })
      }).catch(() => undefined);
    },
    [setTheme, session?.user?.id, workspaceId]
  );

  return { theme, applyTheme };
}
