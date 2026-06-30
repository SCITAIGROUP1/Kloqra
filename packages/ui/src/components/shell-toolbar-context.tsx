"use client";

import { createContext, isValidElement, useContext, type ReactNode } from "react";

export type ShellToolbarParts = {
  search?: ReactNode;
  actions?: ReactNode;
};

export type ShellToolbarValue = ReactNode | ShellToolbarParts;

export function isShellToolbarParts(value: ShellToolbarValue): value is ShellToolbarParts {
  return (
    typeof value === "object" &&
    value !== null &&
    !isValidElement(value) &&
    ("search" in value || "actions" in value)
  );
}

export function resolveShellToolbar(toolbar: ShellToolbarValue | null) {
  if (!toolbar) {
    return { search: null, actions: null, legacy: false as const };
  }

  if (isShellToolbarParts(toolbar)) {
    return {
      search: toolbar.search ?? null,
      actions: toolbar.actions ?? null,
      legacy: false as const
    };
  }

  return { search: null, actions: toolbar, legacy: true as const };
}

const ShellToolbarContext = createContext<ShellToolbarValue | null>(null);

export function ShellToolbarProvider({
  toolbar,
  children
}: {
  toolbar?: ShellToolbarValue;
  children: ReactNode;
}) {
  return (
    <ShellToolbarContext.Provider value={toolbar ?? null}>{children}</ShellToolbarContext.Provider>
  );
}

export function useShellToolbar() {
  return useContext(ShellToolbarContext);
}
