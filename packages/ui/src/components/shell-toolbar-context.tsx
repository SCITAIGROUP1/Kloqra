"use client";

import { createContext, useContext, type ReactNode } from "react";

const ShellToolbarContext = createContext<ReactNode>(null);

export function ShellToolbarProvider({
  toolbar,
  children
}: {
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ShellToolbarContext.Provider value={toolbar ?? null}>{children}</ShellToolbarContext.Provider>
  );
}

export function useShellToolbar() {
  return useContext(ShellToolbarContext);
}
