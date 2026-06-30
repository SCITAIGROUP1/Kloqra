"use client";

import { cn } from "@kloqra/ui";
import { Search } from "lucide-react";

type GlobalSearchTriggerProps = {
  onOpen: () => void;
  className?: string;
};

export function GlobalSearchTrigger({ onOpen, className }: GlobalSearchTriggerProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="global-search-open"
      className={cn(
        "inline-flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/70",
        "justify-start text-left",
        className
      )}
      aria-label="Search"
    >
      <Search className="size-4 shrink-0" aria-hidden />
      <span className="flex-1 truncate">Search…</span>
      <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground @min-[960px]/shell:inline">
        ⌘K
      </kbd>
    </button>
  );
}
