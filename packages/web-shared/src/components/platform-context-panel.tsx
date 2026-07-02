"use client";

import { BRAND_NAME, PLATFORM_PORTAL_LABEL } from "@kloqra/contracts";
import { Badge, Button, cn } from "@kloqra/ui";
import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
export type PlatformContextPanelProps = {
  backHref?: string;
  collapsed?: boolean;
  showBackLink?: boolean;
};

const CONSOLE_SCOPE_LABEL = "Console";

function PlatformIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
        className
      )}
    >
      <Shield className="size-4" strokeWidth={1.5} aria-hidden />
    </span>
  );
}

export function PlatformContextPanel({
  backHref = "/tenants",
  collapsed = false,
  showBackLink = false
}: PlatformContextPanelProps) {
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  const scopeLabel = showBackLink ? "Account" : CONSOLE_SCOPE_LABEL;

  useLayoutEffect(() => {
    if (!open || !containerRef.current) {
      setMenuStyle(null);
      return;
    }

    function updatePosition() {
      const node = containerRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      if (collapsed) {
        setMenuStyle({
          position: "fixed",
          top: rect.top,
          left: rect.right + 8,
          width: "17rem"
        });
      } else {
        setMenuStyle({
          position: "fixed",
          top: rect.bottom + 6,
          left: rect.left,
          width: rect.width
        });
      }
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, collapsed]);

  const collapsedMenu =
    open && collapsed && menuStyle && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            style={menuStyle}
            className="z-[80] overflow-hidden rounded-xl border border-border/80 bg-card p-3 shadow-lg"
          >
            <p className="truncate text-sm font-medium">{BRAND_NAME}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{scopeLabel}</p>
            {showBackLink ? (
              <Button variant="outline" size="sm" className="mt-3 w-full gap-2" asChild>
                <Link
                  href={backHref}
                  aria-label="Back to platform console"
                  onClick={() => setOpen(false)}
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  Back to console
                </Link>
              </Button>
            ) : null}
          </div>,
          document.body
        )
      : null;

  if (collapsed) {
    return (
      <div ref={containerRef} className="relative flex w-full justify-center">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="true"
          aria-controls={menuId}
          aria-label={PLATFORM_PORTAL_LABEL}
          onClick={() => setOpen((value) => !value)}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-muted/20 text-primary shadow-sm transition-colors hover:bg-muted/40"
          title={PLATFORM_PORTAL_LABEL}
        >
          <Shield className="size-4" aria-hidden />
        </button>
        {collapsedMenu}
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-muted/15 px-2 py-2">
        <PlatformIcon />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{BRAND_NAME}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>{scopeLabel}</span>
            <span aria-hidden>·</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
              {PLATFORM_PORTAL_LABEL}
            </Badge>
          </p>
        </div>
      </div>

      {showBackLink ? (
        <Button variant="outline" size="sm" className="w-full gap-2" asChild>
          <Link href={backHref} aria-label="Back to platform console">
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            <span className="truncate">Back to console</span>
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
