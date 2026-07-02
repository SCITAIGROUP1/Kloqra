"use client";

import { Badge, Button, cn, Skeleton } from "@kloqra/ui";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTenantCurrent } from "../features/tenant/use-tenant-current";
import { useTenantOverview } from "../features/tenant/use-tenant-overview";
import { useSessionStore } from "../stores/session.store";

export type OrganizationContextPanelProps = {
  backHref?: string;
  collapsed?: boolean;
};

function orgInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function OrgIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
        className
      )}
    >
      <Building2 className="size-4" strokeWidth={1.5} aria-hidden />
    </span>
  );
}

export function OrganizationContextPanel({
  backHref = "/dashboard",
  collapsed = false
}: OrganizationContextPanelProps) {
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const session = useSessionStore((s) => s.session);
  const workspaceName = session?.workspaceName ?? "workspace";
  const { tenant, loading: tenantLoading } = useTenantCurrent();
  const { overview, loading: overviewLoading } = useTenantOverview();
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  const loading = tenantLoading || overviewLoading;
  const planName = overview?.subscription.planName;

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
            <p className="truncate text-sm font-medium">{tenant?.name ?? "Organization"}</p>
            {planName ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">Owner · {planName}</p>
            ) : null}
            <Button variant="outline" size="sm" className="mt-3 w-full gap-2" asChild>
              <Link
                href={backHref}
                aria-label={`Back to ${workspaceName} workspace`}
                onClick={() => setOpen(false)}
              >
                <ArrowLeft className="size-4" aria-hidden />
                Back to {workspaceName}
              </Link>
            </Button>
          </div>,
          document.body
        )
      : null;

  if (collapsed) {
    const initials = orgInitials(tenant?.name ?? "Organization");
    return (
      <div ref={containerRef} className="relative flex w-full justify-center">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="true"
          aria-controls={menuId}
          aria-label={tenant?.name ?? "Organization"}
          onClick={() => setOpen((value) => !value)}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-muted/20 text-[10px] font-semibold uppercase tracking-wide text-foreground shadow-sm transition-colors hover:bg-muted/40"
          title={tenant?.name ?? "Organization"}
        >
          {loading ? <Skeleton className="h-6 w-6 rounded-md" /> : initials}
        </button>
        {collapsedMenu}
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-muted/15 px-2 py-2">
        {loading ? <Skeleton className="h-8 w-8 shrink-0 rounded-lg" /> : <OrgIcon />}
        <div className="min-w-0 flex-1">
          {loading ? (
            <>
              <Skeleton className="mb-1.5 h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </>
          ) : (
            <>
              <p className="truncate text-sm font-medium leading-tight">
                {tenant?.name ?? "Organization"}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>Owner</span>
                {planName ? (
                  <>
                    <span aria-hidden>·</span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
                      {planName}
                    </Badge>
                  </>
                ) : null}
              </p>
            </>
          )}
        </div>
      </div>

      <Button variant="outline" size="sm" className="w-full gap-2" asChild>
        <Link href={backHref} aria-label={`Back to ${workspaceName} workspace`}>
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          <span className="truncate">Back to {workspaceName}</span>
        </Link>
      </Button>
    </div>
  );
}
