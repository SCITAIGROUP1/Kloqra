"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { ThemePreferenceSync } from "./theme-preference-sync";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemePreferenceSync />
      {children}
    </ThemeProvider>
  );
}
