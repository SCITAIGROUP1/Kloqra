"use client";

import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ShellMenuItem,
  ShellMenuPanel,
  cn
} from "@kloqra/ui";
import { ChevronDown, Move, RotateCcw, Save, X } from "lucide-react";
import { useState } from "react";

type DashboardArrangeBannerProps = {
  editModeLabel?: string;
  onCancel: () => void;
  onResetLayout: () => void;
  onDone: () => void;
  onSaveAsDefault: () => void;
};

export function DashboardArrangeBanner({
  editModeLabel = "Edit Mode",
  onCancel,
  onResetLayout,
  onDone,
  onSaveAsDefault
}: DashboardArrangeBannerProps) {
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);

  function handleSave() {
    setSaveMenuOpen(false);
    onDone();
  }

  function handleSaveAsDefault() {
    setSaveMenuOpen(false);
    onSaveAsDefault();
  }

  return (
    <div className="sticky top-0 z-40 w-full border-b border-border/60 bg-card/85 shadow-sm backdrop-blur-md animate-in slide-in-from-top-2 fade-in duration-200">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Move className="size-4 shrink-0 animate-pulse text-primary" />
          <span className="text-sm font-semibold">Rearranging Layout</span>
          <span className="hidden rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            {editModeLabel}
          </span>
          <span className="ml-1 hidden text-[10px] text-muted-foreground md:inline">
            Drag anywhere on a widget to move; drag edges or the corner to resize.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <X className="size-3.5" />
            Cancel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onResetLayout}
            className="h-8 gap-1.5 text-xs font-semibold hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <RotateCcw className="size-3.5" />
            Reset Layout
          </Button>
          <div className="flex items-center">
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8 gap-1.5 rounded-r-none border-r-0 pr-2.5 text-xs font-semibold shadow-sm"
            >
              <Save className="size-3.5" />
              Save
            </Button>
            <Popover open={saveMenuOpen} onOpenChange={setSaveMenuOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  aria-label="Save options"
                  aria-haspopup="menu"
                  aria-expanded={saveMenuOpen}
                  className="h-8 rounded-l-none px-1.5 shadow-sm"
                >
                  <ChevronDown className="size-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" side="bottom" sideOffset={4} className="w-auto p-0">
                <ShellMenuPanel
                  className={cn(
                    "static right-auto top-auto mt-0 min-w-[11rem] border-0 bg-transparent p-1 shadow-none animate-none"
                  )}
                >
                  <ShellMenuItem onClick={handleSave}>
                    <Save className="size-4 shrink-0" aria-hidden />
                    Save layout
                  </ShellMenuItem>
                  <ShellMenuItem onClick={handleSaveAsDefault}>
                    <Save className="size-4 shrink-0" aria-hidden />
                    Save as default
                  </ShellMenuItem>
                </ShellMenuPanel>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}
