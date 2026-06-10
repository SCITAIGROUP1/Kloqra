"use client";
import { Button } from "@kloqra/ui";
import { RotateCcw, Check, Sparkles, Filter, X } from "lucide-react";
import React, { useState } from "react";
import {
  WIDGET_REGISTRY,
  WIDGET_ICONS,
  WIDGET_GROUPS,
  type WidgetLayoutItem,
  type WidgetGroup
} from "./widget-registry";

interface WidgetControlPanelProps {
  layoutItems: WidgetLayoutItem[];
  onToggleWidget: (id: string) => void;
  onResetLayout: () => void;
  onClose: () => void;
}

export function WidgetControlPanel({
  layoutItems,
  onToggleWidget,
  onResetLayout,
  onClose
}: WidgetControlPanelProps) {
  const [selectedGroup, setSelectedGroup] = useState<WidgetGroup | "all">("all");

  const filteredWidgets = WIDGET_REGISTRY.filter(
    (w) => selectedGroup === "all" || w.group === selectedGroup
  );

  return (
    <>
      {/* Sliding Customize Drawer (Sheet) */}
      <div className="fixed top-0 right-0 h-screen w-[420px] bg-card/95 backdrop-blur-md border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-350 ease-out select-none">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/40 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4.5 text-primary animate-pulse" />
              <h3 className="text-base font-bold tracking-tight text-foreground">
                Customize Dashboard
              </h3>
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal max-w-[320px]">
              Toggle widgets on/off below. Drag anywhere on a widget to reposition it, or drag edges
              or the corner to resize.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Close panel"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Group Selector Chips (Categorized Tabs) */}
        <div className="px-6 py-4 bg-muted/20 border-b border-border/30 shrink-0">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Filter className="size-3" />
            <span>Filter Categories</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedGroup("all")}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                selectedGroup === "all"
                  ? "bg-primary text-primary-foreground border-primary font-medium"
                  : "bg-background hover:bg-muted text-muted-foreground border-border/60"
              }`}
            >
              All Widgets
            </button>
            {WIDGET_GROUPS.map((group) => (
              <button
                key={group.value}
                onClick={() => setSelectedGroup(group.value)}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                  selectedGroup === group.value
                    ? "bg-primary text-primary-foreground border-primary font-medium"
                    : "bg-background hover:bg-muted text-muted-foreground border-border/60"
                }`}
              >
                {group.label
                  .replace(" Analytics", "")
                  .replace(" & People", "")
                  .replace(" & Trends", "")}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Widget Catalog */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 scrollbar-thin scrollbar-thumb-border">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Available Widgets ({filteredWidgets.length})
          </div>
          {filteredWidgets.map((w) => {
            const layoutItem = layoutItems.find((item) => item.i === w.id);
            const isVisible = layoutItem?.visible ?? w.defaultVisible;
            const IconComponent = WIDGET_ICONS[w.iconName] || Filter;

            return (
              <div
                key={w.id}
                onClick={() => onToggleWidget(w.id)}
                className={`flex items-start justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isVisible
                    ? "bg-primary/[0.03] border-primary/20 shadow-sm hover:border-primary/30"
                    : "bg-muted/10 border-border/40 opacity-70 hover:opacity-100 hover:bg-muted/30"
                }`}
              >
                <div className="flex gap-3 min-w-0 pr-2">
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 transition-colors ${
                      isVisible ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <IconComponent className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      {w.label}
                      {isVisible && (
                        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.2 rounded-full font-medium shrink-0">
                          Active
                        </span>
                      )}
                    </span>
                    <p className="text-[10px] text-muted-foreground leading-snug mt-1">
                      {w.description}
                    </p>
                    <p className="text-[9px] text-muted-foreground/60 mt-1 font-mono">
                      Min: {w.minSize.w}x{w.minSize.h} | Default: {w.defaultSize.w}x
                      {w.defaultSize.h}
                    </p>
                  </div>
                </div>

                {/* Luxury Custom Toggle Switch */}
                <div className="shrink-0 pt-0.5">
                  <div
                    role="switch"
                    aria-checked={isVisible}
                    className={`w-9 h-5 rounded-full transition-colors relative border ${
                      isVisible
                        ? "bg-primary border-primary"
                        : "bg-muted-foreground/15 border-border"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-background shadow-sm transition-transform duration-200 ${
                        isVisible ? "translate-x-4" : ""
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-border/40 bg-muted/20 shrink-0 flex items-center justify-between gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={onResetLayout}
            className="h-9 gap-1.5 text-xs font-semibold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 flex-1"
          >
            <RotateCcw className="size-3.5" />
            Reset Layout
          </Button>
          <Button
            size="sm"
            onClick={onClose}
            className="h-9 gap-1.5 text-xs font-semibold shadow-sm flex-1"
          >
            <Check className="size-3.5" />
            Done Editing
          </Button>
        </div>
      </div>
    </>
  );
}
