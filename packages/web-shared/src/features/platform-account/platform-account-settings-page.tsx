"use client";

import { Card, CardContent, CrossfadePresence, LoadingCrossfade, Skeleton } from "@kloqra/ui";
import { Bell, Monitor, Shield } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { SettingsNavItem, SettingsSectionId } from "../account/settings/settings-nav";
import { SettingsShell } from "../account/settings/settings-shell";
import { PlatformAppearanceSection } from "./platform-appearance-section";
import { PlatformNotificationsSection } from "./platform-notifications-section";
import { PlatformSecuritySection } from "./platform-security-section";
import { usePlatformUserProfile } from "./use-platform-user-profile";

type PlatformSettingsSectionId = Extract<
  SettingsSectionId,
  "appearance" | "notifications" | "security"
>;

const NAV_ITEMS: SettingsNavItem[] = [
  { id: "appearance", label: "Appearance", icon: Monitor },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield }
];

function parseSection(value: string | null): PlatformSettingsSectionId {
  if (value === "notifications" || value === "security") return value;
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

export function PlatformAccountSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = useMemo(() => parseSection(searchParams.get("section")), [searchParams]);

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
  } = usePlatformUserProfile();

  function handleSectionChange(section: PlatformSettingsSectionId) {
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
          navItems={NAV_ITEMS}
          activeSection={activeSection}
          onSectionChange={(id) => handleSectionChange(id as PlatformSettingsSectionId)}
        >
          <CrossfadePresence presenceKey={activeSection}>
            {activeSection === "appearance" ? (
              <PlatformAppearanceSection profile={profile} onSavePreferences={updatePreferences} />
            ) : null}
            {activeSection === "notifications" ? (
              <PlatformNotificationsSection
                profile={profile}
                onSavePreferences={updatePreferences}
              />
            ) : null}
            {activeSection === "security" ? (
              <PlatformSecuritySection
                profile={profile}
                onChangePassword={changePassword}
                onEnable2fa={enable2fa}
                onVerify2fa={verify2fa}
                onDisable2fa={disable2fa}
                onListSessions={listSessions}
                onRevokeSession={revokeSession}
                onRevokeOtherSessions={revokeOtherSessions}
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
