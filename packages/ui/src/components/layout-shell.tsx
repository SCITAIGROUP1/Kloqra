"use client";

import { Menu, X, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";
import { cn } from "../lib/utils.js";
import { resolveActiveNavHref } from "./resolve-active-nav-href.js";
import {
  shellMainClass,
  shellMainContentClass,
  shellMobileDrawerClass,
  shellMobileHeaderClass,
  shellSidebarClass,
  shellSidebarCollapsedWidthClass,
  shellSidebarExpandedWidthClass,
  shellSidebarFooterClass,
  shellSidebarFooterCollapsedClass,
  shellSidebarScrollClass,
  shellSidebarScrollCollapsedClass
} from "./shell/shell-styles.js";
import { ShellToolbarProvider, type ShellToolbarValue } from "./shell-toolbar-context.js";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "kloqra-sidebar-collapsed";
/** Viewport width below which the sidebar defaults to collapsed when no preference is saved. */
const COMPACT_LAPTOP_VIEWPORT_MAX = 1400;

export type SidebarNavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  tourId?: string;
};

function NavBadge({ badge, collapsed }: { badge: number | string; collapsed?: boolean }) {
  const count = typeof badge === "number" ? badge : parseInt(String(badge), 10);
  const showCount = !Number.isNaN(count) && count > 0;
  if (!showCount && badge === 0) return null;
  if (!showCount && !badge) return null;

  if (collapsed) {
    const label = showCount ? (count > 9 ? "9+" : count) : badge;
    const compact = String(label).length === 1;

    return (
      <span
        className={cn(
          "absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-amber-500 font-bold leading-none text-amber-950",
          compact ? "size-3 text-[7px]" : "h-3 min-w-[13px] px-0.5 text-[7px]"
        )}
        aria-hidden
      >
        {label}
      </span>
    );
  }

  return (
    <span className="ml-auto shrink-0 rounded-full border border-status-warning-border bg-status-warning-bg px-2 py-0.5 text-[10px] font-bold text-status-warning-fg">
      {showCount ? count : badge}
    </span>
  );
}

export type ResponsiveLayoutShellProps = {
  children: React.ReactNode;
  navItems: readonly SidebarNavItem[];
  logoIcon: React.ReactNode;
  logoTitle: string;
  logoSubtitle: string;
  logoLinkHref: string;
  workspaceSwitcher: (collapsed: boolean) => React.ReactNode;
  footerContent: (collapsed: boolean) => React.ReactNode;
  impersonationBanner?: React.ReactNode;
  shellToolbar?: ShellToolbarValue;
  /** Uppercase label above nav links (e.g. Workspace / Organization). */
  navSectionLabel?: string;
  /** Accessible name for the sidebar navigation region. */
  navAriaLabel?: string;
};

export function ResponsiveLayoutShell({
  children,
  navItems,
  logoIcon,
  logoTitle,
  logoSubtitle,
  logoLinkHref,
  workspaceSwitcher,
  footerContent,
  impersonationBanner,
  shellToolbar,
  navSectionLabel,
  navAriaLabel = "Desktop Navigation"
}: ResponsiveLayoutShellProps) {
  const pathname = usePathname();
  const activeHref = resolveActiveNavHref(
    pathname,
    navItems.map((item) => item.href)
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load sidebar preference from localStorage after mounting; auto-collapse on compact laptops.
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    if (saved !== null) {
      setIsCollapsed(saved === "true");
      return;
    }
    if (window.innerWidth < COMPACT_LAPTOP_VIEWPORT_MAX) {
      setIsCollapsed(true);
    }
  }, []);

  // Prevent background scrolling on mobile when drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
  };

  return (
    <div className="flex h-dvh overflow-hidden flex-col bg-background md:flex-row">
      {/* --- DESKTOP SIDEBAR --- */}
      <aside
        className={cn(
          shellSidebarClass,
          isCollapsed ? shellSidebarCollapsedWidthClass : shellSidebarExpandedWidthClass
        )}
      >
        <div
          className={cn(
            isCollapsed ? shellSidebarScrollCollapsedClass : shellSidebarScrollClass,
            "gap-5"
          )}
        >
          {/* Brand + collapse */}
          <div
            className={cn(
              "w-full transition-all duration-300",
              isCollapsed ? "flex flex-col items-center gap-1.5" : "flex items-center gap-2"
            )}
          >
            <Link
              href={logoLinkHref}
              className={cn(
                "flex min-w-0 items-center rounded-xl transition-all duration-300",
                isCollapsed ? "justify-center p-0" : "flex-1 gap-3 py-0.5"
              )}
            >
              {logoIcon}
              <div
                className={cn(
                  "min-w-0 transition-all duration-300 ease-in-out origin-left",
                  isCollapsed
                    ? "opacity-0 w-0 scale-95 overflow-hidden absolute pointer-events-none"
                    : "opacity-100"
                )}
              >
                <p className="truncate text-sm font-medium tracking-tight">{logoTitle}</p>
                <p className="truncate text-xs text-muted-foreground">{logoSubtitle}</p>
              </div>
            </Link>
            {mounted ? (
              <button
                type="button"
                onClick={toggleCollapse}
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition-all duration-300 hover:bg-muted/50 hover:text-foreground focus:outline-none cursor-pointer",
                  isCollapsed ? "h-7 w-7" : "h-8 w-8 mr-0.5"
                )}
                style={{ transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)" }}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
              </button>
            ) : null}
          </div>

          {/* Workspace Switcher Slot */}
          <div className={cn("w-full", isCollapsed && "flex justify-center")}>
            {workspaceSwitcher(isCollapsed)}
          </div>

          {/* Navigation Links */}
          {!isCollapsed && navSectionLabel ? (
            <p
              className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              aria-hidden
            >
              {navSectionLabel}
            </p>
          ) : null}
          <nav
            className={cn("flex w-full flex-col", isCollapsed ? "items-center gap-1" : "gap-0.5")}
            aria-label={navAriaLabel}
          >
            {navItems.map(({ href, label, Icon, badge, tourId }) => {
              const active = href === activeHref;
              const showBadge =
                badge !== undefined && badge !== "" && (typeof badge !== "number" || badge > 0);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  title={isCollapsed ? label : undefined}
                  data-tour={tourId}
                  className={cn(
                    "group relative flex items-center rounded-lg text-sm font-medium transition-all duration-[var(--motion-base)] ease-[var(--motion-ease-out)]",
                    isCollapsed ? "h-9 w-9 shrink-0 justify-center p-0" : "gap-3 px-3 py-2.5",
                    active
                      ? "bg-primary/12 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                  )}
                >
                  {active && (
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-primary transition-all duration-[var(--motion-base)] ease-[var(--motion-ease-out)]",
                        isCollapsed ? "h-8 w-1" : "h-6 w-1"
                      )}
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn("relative shrink-0", isCollapsed && showBadge && "inline-flex")}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                      aria-hidden
                    />
                    {showBadge && isCollapsed && <NavBadge badge={badge} collapsed />}
                  </span>
                  <span
                    className={cn(
                      "transition-all duration-300 truncate origin-left flex-1 min-w-0",
                      isCollapsed
                        ? "opacity-0 w-0 scale-95 overflow-hidden absolute pointer-events-none"
                        : "opacity-100"
                    )}
                  >
                    {label}
                  </span>
                  {showBadge && !isCollapsed && <NavBadge badge={badge} />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className={isCollapsed ? shellSidebarFooterCollapsedClass : shellSidebarFooterClass}>
          {footerContent(isCollapsed)}
        </div>
      </aside>

      {/* --- MOBILE NAVBAR --- */}
      <header className={shellMobileHeaderClass}>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/80 bg-muted/40 text-muted-foreground hover:bg-background/60 hover:text-foreground transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href={logoLinkHref} className="flex items-center gap-2 font-medium">
          {logoIcon}
          <span className="text-sm tracking-tight">{logoTitle}</span>
        </Link>

        {/* Spacer to balance menu button */}
        <div className="w-10" />
      </header>

      {/* --- MOBILE SIDEBAR DRAWER --- */}
      {/* Drawer Overlay Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-300 md:hidden",
          isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Drawer Panel */}
      <aside
        className={cn(shellMobileDrawerClass, isMobileOpen ? "translate-x-0" : "-translate-x-full")}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <Link
            href={logoLinkHref}
            className="flex items-center gap-3 rounded-xl py-0.5"
            onClick={() => setIsMobileOpen(false)}
          >
            {logoIcon}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium tracking-tight">{logoTitle}</p>
              <p className="truncate text-xs text-muted-foreground">{logoSubtitle}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-muted/40 text-muted-foreground hover:bg-background/60 hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto py-4">
          {workspaceSwitcher(false)}

          {navSectionLabel ? (
            <p
              className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              aria-hidden
            >
              {navSectionLabel}
            </p>
          ) : null}
          <nav className="flex flex-col gap-0.5" aria-label={navAriaLabel}>
            {navItems.map(({ href, label, Icon, badge, tourId }) => {
              const active = href === activeHref;
              const showBadge =
                badge !== undefined && badge !== "" && (typeof badge !== "number" || badge > 0);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  data-tour={tourId}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-[var(--motion-base)] ease-[var(--motion-ease-out)]",
                    active
                      ? "bg-primary/12 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                  )}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-all duration-[var(--motion-base)] ease-[var(--motion-ease-out)]"
                      aria-hidden
                    />
                  )}
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                    aria-hidden
                  />
                  <span className="flex-1">{label}</span>
                  {showBadge && <NavBadge badge={badge} />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Drawer Footer */}
        <div className="shrink-0 space-y-3 border-t border-border/70 pt-4">
          {footerContent(false)}
        </div>
      </aside>

      {/* --- MAIN PAGE CONTENT --- */}
      <main className={shellMainClass}>
        {impersonationBanner}
        <ShellToolbarProvider toolbar={shellToolbar}>
          <div
            className={cn("@container/shell mx-auto w-full max-w-[1600px]", shellMainContentClass)}
          >
            {children}
          </div>
        </ShellToolbarProvider>
      </main>
    </div>
  );
}
