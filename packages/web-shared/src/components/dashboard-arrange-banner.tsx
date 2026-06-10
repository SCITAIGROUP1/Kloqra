"use client";

import { Button } from "@kloqra/ui";
import { Check, Move, RotateCcw, Save } from "lucide-react";

type DashboardArrangeBannerProps = {
  editModeLabel?: string;
  onResetLayout: () => void;
  onDone: () => void;
  onSaveAsDefault: () => void;
};

export function DashboardArrangeBanner({
  editModeLabel = "Edit Mode",
  onResetLayout,
  onDone,
  onSaveAsDefault
}: DashboardArrangeBannerProps) {
  return (
    <div className="sticky top-0 z-40 w-full border-b border-border/60 bg-card/85 shadow-sm backdrop-blur-md animate-in slide-in-from-top-2 fade-in duration-200">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3 lg:px-8">
        <div className="flex items-center gap-2">
          <Move className="size-4 shrink-0 animate-pulse text-primary" />
          <span className="text-sm font-semibold">Rearranging Layout</span>
          <span className="hidden rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            {editModeLabel}
          </span>
          <span className="ml-1 hidden text-[10px] text-muted-foreground md:inline">
            Drag anywhere on a widget to move; drag edges or the corner to resize.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onResetLayout}
            className="h-8 gap-1.5 text-xs font-semibold hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <RotateCcw className="size-3.5" />
            Reset Layout
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDone}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <Check className="size-3.5" />
            Done
          </Button>
          <Button
            size="sm"
            onClick={onSaveAsDefault}
            className="h-8 gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Save className="size-3.5" />
            <span className="hidden sm:inline">Done &amp; save as default</span>
            <span className="sm:hidden">Save default</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
