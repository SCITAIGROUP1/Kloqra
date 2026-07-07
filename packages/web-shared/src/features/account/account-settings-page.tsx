"use client";

import { CrossfadePresence, EmptyState, LoadingCrossfade, Skeleton, Button } from "@kloqra/ui";
import { Bell, Clock, Monitor, Shield, UserCog } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useSessionStore } from "../../stores/session.store";
import { AccountPreferencesSection } from "./settings/sections/account-preferences-section";
import { AppearanceSection } from "./settings/sections/appearance-section";
import { NotificationsSection } from "./settings/sections/notifications-section";
import { SecuritySection } from "./settings/sections/security-section";
import { TimeSettingsSection } from "./settings/sections/time-settings-section";
import type { SettingsNavItem, SettingsSectionId } from "./settings/settings-nav";
import { SettingsShell } from "./settings/settings-shell";
import { useUserProfile } from "./use-user-profile";

const NAV_ITEMS: SettingsNavItem[] = [
  { id: "appearance", label: "Appearance", icon: Monitor },
  { id: "time", label: "Time Settings", icon: Clock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "account", label: "Account Preferences", icon: UserCog }
];

function parseSection(value: string | null): SettingsSectionId {
  if (
    value === "time" ||
    value === "notifications" ||
    value === "security" ||
    value === "account"
  ) {
    return value;
  }
  return "appearance";
}

function SettingsLoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-[28rem] rounded-xl" />
    </div>
  );
}

export function AccountSettingsPage({
  notificationsVariant = "member",
  basePath = "/settings"
}: {
  notificationsVariant?: "member" | "admin";
  /** Base URL for section navigation. Defaults to /settings. Pass /account/settings when used in org-mode context. */
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = useMemo(() => parseSection(searchParams.get("section")), [searchParams]);

  const isOrgMode = basePath === "/account/settings";
  const isAdminApp = notificationsVariant === "admin";
  const session = useSessionStore((s) => s.session);

  const effectiveVariant = useMemo(() => {
    if (isOrgMode) {
      return "tenant-admin-org" as const;
    }
    // Workspace Mode
    const isOwnerOrAdmin = session?.tenantRole === "OWNER" || session?.tenantRole === "ADMIN";
    const isWorkspaceAdmin = session?.workspaceRole === "ADMIN";
    if (isWorkspaceAdmin || isOwnerOrAdmin) {
      return "workspace-admin" as const;
    }
    const isProjectLead = Boolean(
      session?.managedProjectIds && session.managedProjectIds.length > 0
    );
    if (isProjectLead) {
      return "project-manager" as const;
    }
    return "member" as const;
  }, [isOrgMode, session]);

  const isImpersonating = Boolean(useSessionStore((s) => s.session?.impersonatorId));
  const {
    profile,
    loading,
    error,
    reload,
    updatePreferences,
    changePassword,
    listSessions,
    revokeSession,
    revokeOtherSessions,
    enable2fa,
    verify2fa,
    disable2fa
  } = useUserProfile();

  const visibleNav = useMemo(() => {
    let items = NAV_ITEMS;
    if (isOrgMode) {
      items = items.filter((item) => item.id !== "time");
    }
    if (isImpersonating) {
      items = items.filter((item) => item.id !== "security");
    }
    return items;
  }, [isOrgMode, isImpersonating]);

  function handleSectionChange(section: SettingsSectionId) {
    router.replace(`${basePath}?section=${section}`, { scroll: false });
  }

  if (error || (!loading && !profile)) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <EmptyState
          title="Unable to load settings"
          description={
            error ??
            "We couldn't retrieve your account settings. Check your connection and try again."
          }
          action={
            <Button variant="outline" onClick={() => void reload()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <LoadingCrossfade loading={loading} loaderLabel="Loading settings…">
      {profile ? (
        <SettingsShell
          navItems={visibleNav}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        >
          {isImpersonating && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
              Settings cannot be changed while viewing as a member.
            </div>
          )}
          <CrossfadePresence presenceKey={activeSection} duration={0.12}>
            {activeSection === "appearance" ? (
              <AppearanceSection profile={profile} onSavePreferences={updatePreferences} />
            ) : null}
            {activeSection === "time" ? (
              <TimeSettingsSection profile={profile} onSavePreferences={updatePreferences} />
            ) : null}
            {activeSection === "notifications" ? (
              <NotificationsSection
                profile={profile}
                onSavePreferences={updatePreferences}
                variant={effectiveVariant}
              />
            ) : null}
            {activeSection === "security" ? (
              <SecuritySection
                profile={profile}
                onChangePassword={changePassword}
                onEnable2fa={enable2fa}
                onVerify2fa={(code) => verify2fa({ code })}
                onDisable2fa={(currentPassword, code) => disable2fa({ currentPassword, code })}
                onListSessions={listSessions}
                onRevokeSession={revokeSession}
                onRevokeOtherSessions={revokeOtherSessions}
              />
            ) : null}
            {activeSection === "account" ? (
              <AccountPreferencesSection
                profile={profile}
                onSavePreferences={updatePreferences}
                isAdminApp={isAdminApp}
              />
            ) : null}
          </CrossfadePresence>
        </SettingsShell>
      ) : (
        <SettingsLoadingSkeleton />
      )}
    </LoadingCrossfade>
  );
}
