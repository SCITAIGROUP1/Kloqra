"use client";

import type { ReactNode } from "react";

export function AccountSectionFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 flex items-center justify-end gap-3 border-t border-border bg-muted/20 -mx-6 px-6 py-4">
      {children}
    </div>
  );
}
