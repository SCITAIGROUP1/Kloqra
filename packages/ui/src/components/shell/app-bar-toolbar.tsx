"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/utils.js";
import { appBarToolbarClass, appBarToolbarSeparatorClass } from "./shell-styles.js";

export function AppBarToolbar({
  pageActions,
  shellActions,
  className
}: {
  pageActions?: ReactNode;
  shellActions?: ReactNode;
  className?: string;
}) {
  if (!pageActions && !shellActions) return null;

  return (
    <div className={cn(appBarToolbarClass, className)}>
      {pageActions}
      {pageActions && shellActions ? (
        <div className={appBarToolbarSeparatorClass} aria-hidden />
      ) : null}
      {shellActions}
    </div>
  );
}
