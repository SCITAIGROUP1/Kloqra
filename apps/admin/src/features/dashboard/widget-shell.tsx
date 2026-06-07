"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@chronomint/ui";
import { GripVertical, MoreVertical, EyeOff } from "lucide-react";
import React, { forwardRef, useState, useRef, useEffect } from "react";

export interface WidgetShellProps {
  id: string;
  label: string;
  isEditing: boolean;
  onHide: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  headerActions?: React.ReactNode;
}

export const WidgetShell = forwardRef<HTMLDivElement, WidgetShellProps>(
  ({ label, isEditing, onHide, children, className, style, headerActions }, ref) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
      if (!menuOpen) return;

      function handleClickOutside(event: MouseEvent) {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          setMenuOpen(false);
        }
      }

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [menuOpen]);

    // Close menu on Escape key
    useEffect(() => {
      if (!menuOpen) return;

      function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
          setMenuOpen(false);
        }
      }

      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [menuOpen]);

    return (
      <Card
        ref={ref}
        style={style}
        className={`relative flex flex-col h-full w-full overflow-hidden transition-all duration-300 hover:shadow-md border border-border/80 bg-card/90 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300 ${
          isEditing ? "ring-2 ring-primary/20 cursor-default" : ""
        } ${className || ""}`}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3 shrink-0 border-b border-border/40 select-none">
          <div className="flex items-center gap-2 min-w-0">
            {isEditing && (
              <div
                className="drag-handle p-1 -ml-1 rounded hover:bg-muted text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
                title="Drag to reposition"
                aria-roledescription="sortable"
              >
                <GripVertical className="size-4" />
              </div>
            )}
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground truncate">
              {label}
            </CardTitle>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerActions}

            {/* Reusable, accessible custom Dropdown Menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                title="Widget actions"
              >
                <MoreVertical className="size-4" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-1 w-44 rounded-md border border-border bg-popover text-popover-foreground shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-150 focus:outline-none"
                  role="menu"
                  aria-orientation="vertical"
                >
                  <div className="py-1" role="none">
                    <button
                      type="button"
                      onClick={() => {
                        onHide();
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted text-destructive hover:text-destructive-foreground transition-colors text-left"
                      role="menuitem"
                    >
                      <EyeOff className="size-3.5" />
                      Hide widget
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-4 overflow-auto min-h-0 min-w-0">{children}</CardContent>
      </Card>
    );
  }
);

WidgetShell.displayName = "WidgetShell";
