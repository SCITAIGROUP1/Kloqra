"use client";

import { BRAND_NAME } from "@kloqra/contracts";
import { ResponsiveLayoutShell, SidebarUserFooter, type SidebarNavItem } from "@kloqra/ui";
import {
  bootstrapSession,
  BrandMark,
  AdminContextBreadcrumb,
  canAccessAccountMode,
  canAccessAccountPath,
  canLoginToAdminApp,
  canManageOrganization,
  defaultAccountLandingPath,
  logoutSession,
  ShellHeaderActions,
  useNotificationSocket,
  useNotificationUnreadCount,
  useTenantSubscription,
  useUserProfile,
  WorkspaceSwitcher
} from "@kloqra/web-shared";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { AdminScopeHint } from "@/components/admin-scope-hint";
import { ADMIN_NAV_ITEMS } from "@/config/admin-nav";
import { canAccessAdminApp, isProjectLeadOnly } from "@/config/project-manager-nav";
import { usePendingTimesheetsBadgeCount } from "@/features/approvals/use-pending-timesheets";
import { GlobalSearchShell } from "@/features/global-search/global-search-shell";
import { resolveAdminShellMode, resolveAdminShellNav } from "@/lib/resolve-admin-shell-nav";
import { useAdminWorkspaceDataSync } from "@/lib/workspace-data-sync";
import { useSessionStore } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSessionStore((s) => s.session);
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);
  const wsId = session?.workspaceId ?? "";
  const isOwner = session?.tenantRole === "OWNER";
  const canManageOrg = canManageOrganization(session);
  const canUseAdminFeatures = canAccessAdminApp(session?.workspaceRole, session?.managedProjectIds);
  const projectLeadOnly = isProjectLeadOnly(session?.workspaceRole, session?.managedProjectIds);
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
    return resolveAdminShellNav({
      pathname,
      projectLeadOnly,
      workspaceNavItems: ADMIN_NAV_ITEMS,
      pendingCount,
      notificationUnreadCount,
      session
    });
  }, [pathname, projectLeadOnly, pendingCount, notificationUnreadCount, session]);

  useEffect(() => {
    if (session) {
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

    void bootstrapSession({
      allowProjectLead: true,
      allowTenantOperator: true
    })
      .then((result) => {
        if (!result.ok) {
          router.replace("/login?error=admin");
          return;
        }
        setWorkspaces(result.workspaces);
        if (!canLoginToAdminApp(result.session)) {
          router.replace("/select-workspace");
        }
      })
      .catch(() => router.replace("/login?error=admin"));
  }, [session, setWorkspaces, router, isAccountMode, pathname]);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BrandMark size="sm" iconOnly className="animate-pulse" />
          Loading workspace…
        </div>
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
            profileHref="/profile"
            settingsHref="/settings"
            notificationsHref="/notifications"
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
              profileHref="/profile"
              onLogout={() => {
                void logoutSession(session.workspaceId).then(() => router.push("/login"));
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
        <AdminContextBreadcrumb contextMode={isAccountMode ? "account" : "workspace"} />
        {children}
      </ResponsiveLayoutShell>
    </>
  );
}
