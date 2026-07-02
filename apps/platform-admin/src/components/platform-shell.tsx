"use client";

import { BRAND_NAME, PLATFORM_PORTAL_LABEL } from "@kloqra/contracts";
import { ResponsiveLayoutShell, SidebarUserFooter, type SidebarNavItem } from "@kloqra/ui";
import {
  bootstrapPlatformSession,
  BrandMark,
  logoutPlatformSession,
  PlatformContextPanel,
  ShellHeaderActions,
  usePlatformNotificationSocket,
  usePlatformNotificationUnreadCount,
  usePlatformSessionStore
} from "@kloqra/web-shared";
import {
  Building2,
  Bell,
  CreditCard,
  Gauge,
  ScrollText,
  Layers,
  LifeBuoy,
  Users
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { resolvePlatformShellNav } from "@/lib/resolve-platform-shell-nav";

const CONSOLE_NAV_ITEMS: SidebarNavItem[] = [
  { href: "/ops", label: "Ops", Icon: Gauge },
  { href: "/staff", label: "Staff", Icon: Users },
  { href: "/tenants", label: "Tenants", Icon: Building2 },
  { href: "/subscriptions", label: "Subscriptions", Icon: CreditCard },
  { href: "/plans", label: "Plans", Icon: Layers },
  { href: "/helpdesk", label: "Help Desk", Icon: LifeBuoy },
  { href: "/audit", label: "Audit log", Icon: ScrollText },
  { href: "/notifications", label: "Notifications", Icon: Bell }
];

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = usePlatformSessionStore((s) => s.session);

  usePlatformNotificationSocket(Boolean(session));
  const { count: notificationUnreadCount } = usePlatformNotificationUnreadCount(Boolean(session));

  const { mode, navItems } = useMemo(
    () =>
      resolvePlatformShellNav({
        pathname,
        consoleNavItems: CONSOLE_NAV_ITEMS,
        notificationUnreadCount,
        platformRole: session?.platformRole
      }),
    [pathname, notificationUnreadCount, session?.platformRole]
  );

  const isAccountMode = mode === "account";

  useEffect(() => {
    if (session) return;
    void bootstrapPlatformSession()
      .then((result) => {
        if (!result.ok) router.replace("/login");
      })
      .catch(() => router.replace("/login"));
  }, [session, router]);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BrandMark size="sm" iconOnly className="animate-pulse" />
          Loading platform…
        </div>
      </div>
    );
  }

  // Role Guard
  const isSupport = session?.platformRole === "SUPPORT";
  const allowedPrefixes = ["/helpdesk", "/notifications", "/profile", "/settings"];
  const isAllowed =
    !isSupport ||
    allowedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  useEffect(() => {
    if (!isAllowed) {
      router.replace("/helpdesk");
    }
  }, [isAllowed, router]);

  if (!isAllowed) {
    return null;
  }

  return (
    <ResponsiveLayoutShell
      navItems={navItems}
      logoIcon={<BrandMark size="lg" iconOnly />}
      logoTitle={BRAND_NAME}
      logoSubtitle={
        isAccountMode
          ? "Account"
          : session.platformRole === "SUPPORT"
            ? "Platform Support"
            : PLATFORM_PORTAL_LABEL
      }
      logoLinkHref={isAccountMode ? "/profile" : "/tenants"}
      navSectionLabel={isAccountMode ? "Account" : "Platform"}
      navAriaLabel={isAccountMode ? "Account navigation" : "Platform navigation"}
      shellToolbar={
        <ShellHeaderActions
          profileHref="/profile"
          settingsHref="/settings"
          notificationsHref="/notifications"
          userName={session.user.name}
          platformNotifications
        />
      }
      workspaceSwitcher={(collapsed) => (
        <PlatformContextPanel
          collapsed={collapsed}
          showBackLink={isAccountMode}
          backHref="/tenants"
          platformRole={session.platformRole}
        />
      )}
      footerContent={(collapsed) => (
        <SidebarUserFooter
          collapsed={collapsed}
          userName={session.user.name}
          profileHref="/profile"
          onLogout={() => {
            void logoutPlatformSession().then(() => router.push("/login"));
          }}
        />
      )}
    >
      {children}
    </ResponsiveLayoutShell>
  );
}
