"use client";

import { BRAND_NAME } from "@kloqra/contracts";
import { cn } from "@kloqra/ui";
import { Timer } from "lucide-react";
import type { ReactNode } from "react";

export type BrandMarkProps = {
  className?: string;
  iconClassName?: string;
  size?: "sm" | "md" | "lg";
  /** Renders only the icon container (for sidebar logo slots). */
  iconOnly?: boolean;
  showWordmark?: boolean;
  subtitle?: ReactNode;
};

const sizeClasses = {
  sm: { box: "h-8 w-8 rounded-lg", icon: "h-4 w-4" },
  md: { box: "h-10 w-10 rounded-xl", icon: "h-5 w-5" },
  lg: { box: "h-12 w-12 rounded-xl", icon: "h-6 w-6" }
} as const;

export function BrandMark({
  className,
  iconClassName,
  size = "md",
  iconOnly = false,
  showWordmark = false,
  subtitle
}: BrandMarkProps) {
  const s = sizeClasses[size];

  const iconBox = (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-primary text-primary-foreground shadow-md shadow-primary/25",
        s.box,
        iconOnly ? className : undefined
      )}
    >
      <Timer className={cn(s.icon, iconClassName)} strokeWidth={1.5} aria-hidden />
    </div>
  );

  if (iconOnly) {
    return iconBox;
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {iconBox}
      {showWordmark ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium tracking-tight">{BRAND_NAME}</p>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
