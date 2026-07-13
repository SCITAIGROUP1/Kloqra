"use client";

import { BRAND_NAME } from "@kloqra/contracts";
import { Button, ResponsiveLayoutShell, SidebarUserFooter, type SidebarNavItem } from "@kloqra/ui";
import {
  bootstrapSession,
  BrandMark,
  canAccessAccountMode,
  canAccessAccountPath,
  canLoginToAdminApp,
  canManageOrganization,
  defaultAccountLandingPath,
  logoutSession,
  SessionGenerationBoundary,
  ShellHeaderActions,
  shouldRedirectBootstrapToLogin,
  useNotificationSocket,
  useNotificationUnreadCount,
  useTenantSubscription,
  useUserProfile,
  resolveWorkspaceSetupRedirect,
  WorkspaceSwitcher
} from "@kloqra/web-shared";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminScopeHint } from "@/components/admin-scope-hint";
import { ADMIN_NAV_ITEMS } from "@/config/admin-nav";
import { canAccessAdminApp, isProjectLeadOnly } from "@/config/project-manager-nav";
import { usePendingTimesheetsBadgeCount } from "@/features/approvals/use-pending-timesheets";
import { GlobalSearchShell } from "@/features/global-search/global-search-shell";
import { isClientCommercialFeaturesEnabled } from "@/lib/client-commercial-features";
import { resolveAdminShellMode, resolveAdminShellNav } from "@/lib/resolve-admin-shell-nav";
import { useAdminWorkspaceDataSync } from "@/lib/workspace-data-sync";
import { useSessionStore } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSessionStore((s) => s.session);
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);
  const [bootstrapFailure, setBootstrapFailure] = useState<"transient" | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const wsId = session?.workspaceId ?? "";
  const isOwner = session?.tenantRole === "OWNER";
  const canManageOrg = canManageOrganization(session);
  const canUseAdminFeatures = canAccessAdminApp(session?.workspaceRole, session?.managedProjectIds);
  const projectLeadOnly = isProjectLeadOnly(
    session?.workspaceRole,
    session?.managedProjectIds,
    session?.tenantRole
  );
  const managedProjectCount = session?.managedProjectIds?.length ?? 0;
  const isAccountMode = resolveAdminShellMode(pathname, session) === "account";
  const canUsePersonalFeatures = Boolean(wsId);
  const canUseWorkspaceOps = Boolean(wsId && canUseAdminFeatures);
  const notificationsEnabled = isAccountMode ? canUsePersonalFeatures : canUseWorkspaceOps;

  useUserProfile();
  useNotificationSocket(wsId, notificationsEnabled);
  useAdminWorkspaceDataSync(wsId);
  const { count: notificationUnreadCount } = useNotificationUnreadCount(wsId, notificationsEnabled);
  const pendingCount = usePendingTimesheetsBadgeCount(wsId, canUseWorkspaceOps);
  const { subscription } = useTenantSubscription(isOwner);
  const billingAlert = isOwner ? subscription?.billingAlert : null;

  const { mode: _mode, navItems } = useMemo(() => {
    const workspaceNavItems = isClientCommercialFeaturesEnabled()
      ? ADMIN_NAV_ITEMS
      : ADMIN_NAV_ITEMS.filter((item) => item.href !== "/billing");
    return resolveAdminShellNav({
      pathname,
      projectLeadOnly,
      workspaceNavItems,
      pendingCount,
      notificationUnreadCount,
      session
    });
  }, [pathname, projectLeadOnly, pendingCount, notificationUnreadCount, session]);

  useEffect(() => {
    if (session) {
      setBootstrapFailure(null);
      const setupRedirect = resolveWorkspaceSetupRedirect(pathname, session);
      if (setupRedirect) {
        router.replace(setupRedirect);
        return;
      }
      if (!canLoginToAdminApp(session)) {
        router.replace("/select-workspace");
        return;
      }
      if (isAccountMode) {
        if (!canAccessAccountMode(session)) {
          router.replace("/dashboard");
          return;
        }
        if (!canAccessAccountPath(session, pathname)) {
          router.replace(defaultAccountLandingPath(session));
        }
        return;
      }
      if (
        !canAccessAdminApp(session.workspaceRole, session.managedProjectIds) &&
        canAccessAccountMode(session)
      ) {
        router.replace(defaultAccountLandingPath(session));
      }
      return;
    }

    let cancelled = false;
    setBootstrapFailure(null);
    void bootstrapSession({
      allowProjectLead: true,
      allowTenantOperator: true
    })
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          if (shouldRedirectBootstrapToLogin(result.reason)) {
            router.replace("/login?error=admin");
            return;
          }
          setBootstrapFailure("transient");
          return;
        }
        setWorkspaces(result.workspaces);
        if (!canLoginToAdminApp(result.session)) {
          router.replace("/select-workspace");
        }
      })
      .catch(() => {
        if (!cancelled) setBootstrapFailure("transient");
      });

    return () => {
      cancelled = true;
    };
  }, [session, setWorkspaces, router, isAccountMode, pathname, bootstrapAttempt]);

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6">
        {bootstrapFailure === "transient" ? (
          <>
            <p className="max-w-sm text-center text-sm text-muted-foreground">
              Couldn&apos;t restore your session. Check your connection and try again.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBootstrapAttempt((n) => n + 1)}
            >
              Try again
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BrandMark size="sm" iconOnly className="animate-pulse" />
            Loading workspace…
          </div>
        )}
      </div>
    );
  }

  if (isAccountMode && !canAccessAccountPath(session, pathname)) {
    return null;
  }

  const logoSubtitle = isAccountMode ? "Organization" : "Admin Portal";
  const logoLinkHref = isAccountMode ? defaultAccountLandingPath(session) : "/dashboard";
  const navSectionLabel = isAccountMode ? "Organization" : undefined;
  const navAriaLabel = isAccountMode ? "Organization navigation" : "Workspace navigation";

  const settingsHref = isAccountMode ? "/account/settings" : "/settings";

  return (
    <>
      <GlobalSearchShell workspaceId={wsId} isOwner={isOwner} />
      <ResponsiveLayoutShell
        navItems={navItems as SidebarNavItem[]}
        logoIcon={<BrandMark size="lg" iconOnly />}
        logoTitle={BRAND_NAME}
        logoSubtitle={logoSubtitle}
        logoLinkHref={logoLinkHref}
        navSectionLabel={navSectionLabel}
        navAriaLabel={navAriaLabel}
        shellToolbar={
          <ShellHeaderActions
            workspaceId={wsId}
            profileHref={isAccountMode ? "/account/profile" : "/profile"}
            settingsHref={settingsHref}
            notificationsHref={isAccountMode ? "/account/notifications" : "/notifications"}
          />
        }
        workspaceSwitcher={(collapsed) => (
          <WorkspaceSwitcher
            filterAdminAccess
            defaultRedirect="/dashboard"
            collapsed={collapsed}
            organizationHref={canManageOrg ? defaultAccountLandingPath(session) : undefined}
            contextMode={canManageOrg ? (isAccountMode ? "account" : "workspace") : undefined}
          />
        )}
        footerContent={(collapsed) => (
          <div className={collapsed ? "flex flex-col items-center gap-2" : "space-y-3"}>
            {!isAccountMode ? (
              <AdminScopeHint
                projectLeadOnly={projectLeadOnly}
                workspaceName={session.workspaceName}
                managedProjectCount={managedProjectCount}
                collapsed={collapsed}
              />
            ) : null}
            <SidebarUserFooter
              collapsed={collapsed}
              userName={session.user.name ?? (projectLeadOnly ? "Project manager" : "Admin")}
              profileHref={isAccountMode ? "/account/profile" : "/profile"}
              onLogout={() => {
                void logoutSession(session.workspaceId);
              }}
            />
          </div>
        )}
      >
        {billingAlert ? (
          <div
            className="border-b border-status-warning-border bg-status-warning-bg px-4 py-2 text-sm text-status-warning-fg"
            data-testid="global-billing-alert"
          >
            {billingAlert === "past_due"
              ? "Payment is past due — time logging is paused."
              : "Your trial is ending soon."}{" "}
            <Link href="/account/billing" className="font-medium underline">
              Review billing
            </Link>
          </div>
        ) : null}
        <SessionGenerationBoundary>{children}</SessionGenerationBoundary>
      </ResponsiveLayoutShell>
    </>
  );
}
