"use client";

import { cn } from "@kloqra/ui";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  resolvePlatformContextBreadcrumb,
  type PlatformContextMode
} from "../auth/platform-context";

export type PlatformContextBreadcrumbProps = {
  contextMode: PlatformContextMode;
  className?: string;
};

export function PlatformContextBreadcrumb({
  contextMode,
  className
}: PlatformContextBreadcrumbProps) {
  const segments = resolvePlatformContextBreadcrumb({ contextMode });

  if (segments.length === 0) return null;

  return (
    <nav
      aria-label="Current context"
      className={cn(
        "sticky top-0 z-20 -mx-6 border-b border-border/70 bg-background/95 px-6 py-2.5 text-xs text-muted-foreground backdrop-blur-md lg:-mx-8 lg:px-8",
        className
      )}
    >
      <ol className="flex min-w-0 flex-wrap items-center gap-1">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;

          return (
            <li key={`${segment.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <ChevronRight className="size-3 shrink-0 text-muted-foreground/70" aria-hidden />
              ) : null}
              {segment.href && !isLast ? (
                <Link
                  href={segment.href}
                  className="truncate font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {segment.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "truncate",
                    isLast ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {segment.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
