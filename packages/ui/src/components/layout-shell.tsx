"use client";

import { Menu, X, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";
import { cn } from "../lib/utils.js";

export type SidebarNavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

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
  impersonationBanner
}: ResponsiveLayoutShellProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load sidebar preference from localStorage after mounting
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("chronomint-sidebar-collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
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
    localStorage.setItem("chronomint-sidebar-collapsed", String(next));
  };

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      {/* --- DESKTOP SIDEBAR --- */}
      <aside
        className={cn(
          "sticky top-0 h-screen shrink-0 flex-col border-r border-border/80 bg-card/90 shadow-sm backdrop-blur-md transition-all duration-300 ease-in-out hidden md:flex",
          isCollapsed ? "w-[4.5rem]" : "w-[17rem]"
        )}
      >
        {/* Collapse Toggle Button */}
        {mounted && (
          <button
            type="button"
            onClick={toggleCollapse}
            className="absolute -right-3 top-6 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none transition-transform duration-300 cursor-pointer"
            style={{ transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)" }}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <div
          className={cn(
            "flex flex-1 flex-col overflow-y-auto p-4 transition-all duration-300",
            isCollapsed ? "gap-4 items-center" : "gap-5"
          )}
        >
          {/* Logo */}
          <Link
            href={logoLinkHref}
            className={cn(
              "flex items-center rounded-xl transition-all duration-300",
              isCollapsed ? "px-0 py-0.5 justify-center" : "gap-3 px-1 py-0.5 w-full"
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
              {logoIcon}
            </div>
            <div
              className={cn(
                "min-w-0 transition-all duration-300 ease-in-out origin-left",
                isCollapsed
                  ? "opacity-0 w-0 scale-95 overflow-hidden absolute pointer-events-none"
                  : "opacity-100"
              )}
            >
              <p className="truncate text-sm font-semibold tracking-tight">{logoTitle}</p>
              <p className="truncate text-xs text-muted-foreground">{logoSubtitle}</p>
            </div>
          </Link>

          {/* Workspace Switcher Slot */}
          <div className="w-full">{workspaceSwitcher(isCollapsed)}</div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-0.5 w-full" aria-label="Desktop Navigation">
            {navItems.map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  title={isCollapsed ? label : undefined}
                  className={cn(
                    "group relative flex items-center rounded-lg text-sm font-medium transition-all duration-300",
                    isCollapsed ? "justify-center h-10 w-10 mx-auto px-0" : "px-3 py-2.5 gap-3",
                    active
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                  )}
                >
                  {active && (
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300",
                        isCollapsed ? "h-8 w-1" : "h-6 w-1"
                      )}
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
                  <span
                    className={cn(
                      "transition-all duration-300 truncate origin-left",
                      isCollapsed
                        ? "opacity-0 w-0 scale-95 overflow-hidden absolute pointer-events-none"
                        : "opacity-100"
                    )}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Content */}
        <div
          className={cn(
            "shrink-0 border-t border-border/70 p-4 transition-all duration-300",
            isCollapsed ? "flex flex-col items-center justify-center" : ""
          )}
        >
          <div className="w-full">{footerContent(isCollapsed)}</div>
        </div>
      </aside>

      {/* --- MOBILE NAVBAR --- */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/80 bg-card/90 backdrop-blur-md px-4 md:hidden shrink-0">
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/80 bg-muted/40 text-muted-foreground hover:bg-background/60 hover:text-foreground transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href={logoLinkHref} className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            {logoIcon}
          </div>
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
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-[17rem] flex-col border-r border-border/80 bg-card p-4 shadow-xl transition-transform duration-300 ease-in-out md:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <Link
            href={logoLinkHref}
            className="flex items-center gap-3 rounded-xl py-0.5"
            onClick={() => setIsMobileOpen(false)}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
              {logoIcon}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">{logoTitle}</p>
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

          <nav className="flex flex-col gap-0.5" aria-label="Mobile Navigation">
            {navItems.map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                  )}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
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
                  {label}
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
      <main className="min-h-screen min-w-0 flex-1 overflow-y-auto">
        {impersonationBanner}
        <div className="mx-auto w-full max-w-7xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
