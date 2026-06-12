"use client";

import { Card, CardContent } from "@kloqra/ui";
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

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
        <div className="h-[28rem] animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !profile) {
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
    <SettingsShell
      navItems={visibleNav}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
    >
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
        />
      ) : null}
      {activeSection === "account" ? (
        <AccountPreferencesSection profile={profile} onSavePreferences={updatePreferences} />
      ) : null}
    </SettingsShell>
  );
}
