"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { themeStorageKey } from "../hooks/theme-storage";
import { usePlatformSessionStore } from "../stores/platform-session.store";
import { useSessionStore } from "../stores/session.store";
import { ThemePreferenceSync } from "./theme-preference-sync";

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app";

function SessionAwareThemeProvider({ children }: { children: ReactNode }) {
  const tenantUserId = useSessionStore((state) => state.session?.user?.id ?? null);
  const platformUserId = usePlatformSessionStore((state) => state.session?.user.id ?? null);
  const userId = AUTH_SCOPE === "platform" ? platformUserId : tenantUserId;
  const storageKey = themeStorageKey(userId);

  return (
    <ThemeProvider
      key={storageKey}
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey={storageKey}
    >
      <ThemePreferenceSync />
      {children}
    </ThemeProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return <SessionAwareThemeProvider>{children}</SessionAwareThemeProvider>;
}
