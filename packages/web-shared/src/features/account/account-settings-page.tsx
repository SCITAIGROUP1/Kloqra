"use client";

import { Card, CardContent, CrossfadePresence, LoadingCrossfade, Skeleton } from "@kloqra/ui";
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
  notificationsVariant = "member"
}: {
  notificationsVariant?: "member" | "admin";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = useMemo(() => parseSection(searchParams.get("section")), [searchParams]);

  const isImpersonating = Boolean(useSessionStore((s) => s.session?.impersonatorId));
  const {
    profile,
    loading,
    error,
    updatePreferences,
    changePassword,
    listSessions,
    revokeSession,
    revokeOtherSessions,
    enable2fa,
    verify2fa,
    disable2fa
  } = useUserProfile();

  const visibleNav = isImpersonating
    ? NAV_ITEMS.filter((item) => item.id !== "security")
    : NAV_ITEMS;

  function handleSectionChange(section: SettingsSectionId) {
    router.replace(`/settings?section=${section}`, { scroll: false });
  }

  if (error || (!loading && !profile)) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
          <CardContent className="py-8 text-sm text-destructive">
            {error ?? "Could not load settings"}
          </CardContent>
        </Card>
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
                variant={notificationsVariant}
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
              <AccountPreferencesSection profile={profile} onSavePreferences={updatePreferences} />
            ) : null}
          </CrossfadePresence>
        </SettingsShell>
      ) : (
        <SettingsLoadingSkeleton />
      )}
    </LoadingCrossfade>
  );
}
