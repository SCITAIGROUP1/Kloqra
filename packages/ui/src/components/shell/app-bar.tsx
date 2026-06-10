"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/utils.js";
import { useShellToolbar } from "../shell-toolbar-context.js";
import { AppBarToolbar } from "./app-bar-toolbar.js";
import {
  shellAppBarClass,
  shellAppBarDescriptionClass,
  shellAppBarPrimaryRowClass,
  shellAppBarSecondaryRowClass,
  shellAppBarTitleClass
} from "./shell-styles.js";

export type AppBarProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Page-specific actions shown before the global shell toolbar (bell, theme, avatar). */
  actions?: ReactNode;
  /** Optional second row — search, filters, primary CTA, etc. */
  secondary?: ReactNode;
  className?: string;
};

/**
 * Sticky page app bar used across admin/client shells.
 * Shell toolbar actions are injected automatically via `ShellToolbarProvider`.
 */
export function AppBar({ title, description, actions, secondary, className }: AppBarProps) {
  const shellToolbar = useShellToolbar();
  const hasTrailing = Boolean(actions || shellToolbar);

  return (
    <header className={cn(shellAppBarClass, className)}>
      <div className="flex w-full flex-col gap-4">
        <div className={shellAppBarPrimaryRowClass}>
          <div className="min-w-0 space-y-1">
            {typeof title === "string" ? (
              <h1 className={shellAppBarTitleClass}>{title}</h1>
            ) : (
              <div className={shellAppBarTitleClass}>{title}</div>
            )}
            {description ? <div className={shellAppBarDescriptionClass}>{description}</div> : null}
          </div>
          {hasTrailing ? (
            <div className="flex shrink-0">
              <AppBarToolbar pageActions={actions} shellActions={shellToolbar ?? undefined} />
            </div>
          ) : null}
        </div>
        {secondary ? <div className={shellAppBarSecondaryRowClass}>{secondary}</div> : null}
      </div>
    </header>
  );
}

export type AppBarSecondaryProps = {
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

/** Layout helper for the app bar second row (search left, CTA right). */
export function AppBarSecondary({ leading, trailing, className }: AppBarSecondaryProps) {
  if (!leading && !trailing) return null;

  return (
    <>
      {leading ? <div className={cn("min-w-0 flex-1", className)}>{leading}</div> : null}
      {trailing ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{trailing}</div>
      ) : null}
    </>
  );
}
