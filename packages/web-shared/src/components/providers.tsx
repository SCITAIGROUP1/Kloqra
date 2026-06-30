"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { themeStorageKey } from "../hooks/theme-storage";
import { useSessionStore } from "../stores/session.store";
import { ThemePreferenceSync } from "./theme-preference-sync";

function SessionAwareThemeProvider({ children }: { children: ReactNode }) {
  const userId = useSessionStore((state) => state.session?.user?.id ?? null);
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
