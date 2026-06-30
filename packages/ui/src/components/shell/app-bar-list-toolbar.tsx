"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/utils.js";
import { Input } from "../ui/input.js";

/** Shared width/height for filter selects in list page app bar toolbars. */
export const appBarListFilterTriggerClass = "h-10 w-full md:w-[9.5rem]";

export type AppBarListToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchAriaLabel: string;
  filters?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/**
 * Standard list-page toolbar row for AppBar `secondary` — search, optional filters, optional CTA.
 */
export function AppBarListToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  searchAriaLabel,
  filters,
  action,
  className
}: AppBarListToolbarProps) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-2 border-t border-border/60 pt-4 md:flex-row md:items-center md:gap-2",
        className
      )}
    >
      <Input
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        className="h-10 w-full md:max-w-xs md:flex-1 lg:max-w-sm"
        aria-label={searchAriaLabel}
      />
      {filters ? <div className="grid grid-cols-2 gap-2 md:contents">{filters}</div> : null}
      {action ? <div className="w-full shrink-0 md:ml-auto md:w-auto">{action}</div> : null}
    </div>
  );
}
