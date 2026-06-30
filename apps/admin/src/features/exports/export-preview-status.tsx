"use client";

import type { ExportPreviewResponseDto } from "@kloqra/contracts";
import { Badge, cn } from "@kloqra/ui";
import { CheckCircle2, Loader2 } from "lucide-react";

type ExportPreviewStatusProps = {
  loading: boolean;
  preview: ExportPreviewResponseDto | null;
  error: string | null;
  className?: string;
};

export function ExportPreviewStatus({
  loading,
  preview,
  error,
  className
}: ExportPreviewStatusProps) {
  if (error) {
    return (
      <Badge variant="destructive" className={cn("shrink-0 font-normal", className)}>
        Preview failed
      </Badge>
    );
  }

  if (loading) {
    return (
      <Badge
        variant="secondary"
        className={cn("shrink-0 gap-1.5 border-primary/25 bg-primary/10 font-normal", className)}
      >
        <Loader2 className="size-3 animate-spin" aria-hidden />
        Updating preview…
      </Badge>
    );
  }

  if (!preview) {
    return (
      <Badge variant="outline" className={cn("shrink-0 font-normal", className)}>
        Waiting for preview
      </Badge>
    );
  }

  const rows = preview.totalLogRows ?? 0;
  return (
    <Badge
      variant="secondary"
      className={cn(
        "shrink-0 gap-1.5 border-primary/30 bg-primary/10 text-foreground font-normal",
        className
      )}
    >
      <CheckCircle2 className="size-3 text-primary" aria-hidden />
      Preview ready · {rows.toLocaleString()} {rows === 1 ? "entry" : "entries"}
    </Badge>
  );
}
