"use client";

import { AppBar, Card, CardContent, Skeleton } from "@kloqra/ui";
import { PlatformPersonalInfoSection } from "./platform-personal-info-section";
import { PlatformProfileHero } from "./platform-profile-hero";
import { PlatformProfileQuickLinks } from "./platform-profile-quick-links";
import { usePlatformUserProfile } from "./use-platform-user-profile";

export function PlatformProfilePage() {
  const { profile, loading, error, updateName } = usePlatformUserProfile();

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
          <CardContent className="py-8 text-sm text-destructive">
            {error ?? "Could not load profile"}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppBar title="Profile" description="Your platform identity and account shortcuts." />

      <div className="mx-auto w-full max-w-4xl space-y-6">
        <PlatformProfileHero profile={profile} />
        <PlatformPersonalInfoSection
          profile={profile}
          onSave={async (name) => {
            await updateName(name);
          }}
        />
        <PlatformProfileQuickLinks profile={profile} />
      </div>
    </div>
  );
}
