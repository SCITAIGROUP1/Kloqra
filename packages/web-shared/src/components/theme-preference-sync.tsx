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
import { usePlatformSessionStore } from "../stores/platform-session.store";
import { getWorkspaceId, useSessionStore } from "../stores/session.store";

function isPlatformAuthScope(): boolean {
  return (process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app") === "platform";
}

type ThemeProfile = {
  effectiveTheme: ThemePreference;
  preferences: { theme?: ThemePreference };
};

/** Hydrates next-themes from persisted user preference once per login. */
export function ThemePreferenceSync() {
  const { setTheme } = useTheme();
  const tenantSession = useSessionStore((s) => s.session);
  const platformSession = usePlatformSessionStore((s) => s.session);
  const userId = isPlatformAuthScope() ? platformSession?.user.id : tenantSession?.user?.id;
  const workspaceId = tenantSession?.workspaceId ?? getWorkspaceId();

  useEffect(() => {
    if (!userId) {
      clearThemeHydration();
      setTheme(DEFAULT_THEME);
      return;
    }
    if (!shouldHydrateTheme(userId)) return;
    if (!isPlatformAuthScope() && !workspaceId) return;

    const profileRoute = isPlatformAuthScope() ? ROUTES.PLATFORM.ME : ROUTES.USERS.ME;
    const requestOptions = isPlatformAuthScope() || !workspaceId ? undefined : { workspaceId };

    void api<ThemeProfile>(profileRoute, requestOptions)
      .then((profile) => {
        if (!shouldHydrateTheme(userId)) return;
        setTheme(profile.effectiveTheme ?? resolveEffectiveTheme(profile.preferences));
        markThemeHydrated(userId);
      })
      .catch(() => undefined);
  }, [userId, workspaceId, setTheme]);

  return null;
}
