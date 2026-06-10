"use client";

import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils.js";

const sizeClass = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8"
} as const;

export type SpinnerSize = keyof typeof sizeClass;

export function Spinner({
  className,
  size = "md",
  label
}: {
  className?: string;
  size?: SpinnerSize;
  label?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-muted-foreground", className)}>
      <Loader2 className={cn("animate-spin", sizeClass[size])} aria-hidden />
      {label ? <span className="text-sm">{label}</span> : null}
    </span>
  );
}

export function CenteredLoader({
  label = "Loading…",
  className
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-muted-foreground",
        className
      )}
    >
      <Loader2 className="size-8 animate-spin text-primary/80" aria-hidden />
      <p className="text-sm">{label}</p>
    </div>
  );
}
