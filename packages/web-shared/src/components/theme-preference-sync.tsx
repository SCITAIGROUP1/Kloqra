"use client";

import {
  DEFAULT_THEME,
  ROUTES,
  resolveEffectiveTheme,
  type ThemePreference
} from "@kloqra/contracts";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { api } from "../api/client";
import {
  clearThemeHydration,
  markThemeHydrated,
  shouldHydrateTheme
} from "../hooks/theme-preference-state";
import { getWorkspaceId, useSessionStore } from "../stores/session.store";

/** Hydrates next-themes from persisted user preference once per login. */
export function ThemePreferenceSync() {
  const { setTheme } = useTheme();
  const session = useSessionStore((s) => s.session);
  const userId = session?.user?.id;
  const workspaceId = session?.workspaceId ?? getWorkspaceId();

  useEffect(() => {
    if (!userId) {
      clearThemeHydration();
      setTheme(DEFAULT_THEME);
      return;
    }
    if (!workspaceId || !shouldHydrateTheme(userId)) return;

    void api<{ effectiveTheme: ThemePreference; preferences: { theme?: ThemePreference } }>(
      ROUTES.USERS.ME,
      { workspaceId }
    )
      .then((profile) => {
        if (!shouldHydrateTheme(userId)) return;
        setTheme(profile.effectiveTheme ?? resolveEffectiveTheme(profile.preferences));
        markThemeHydrated(userId);
      })
      .catch(() => undefined);
  }, [userId, workspaceId, setTheme]);

  return null;
}
