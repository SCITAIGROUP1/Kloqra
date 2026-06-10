"use client";

import { AppBar, Card, CardContent, SegmentedControl } from "@kloqra/ui";
import Link from "next/link";
import { useState } from "react";
import { PersonalInfoSection } from "./profile/personal-info-section";
import { ProfileHero } from "./profile/profile-hero";
import { WorkDetailsSection } from "./profile/work-details-section";
import { useUserProfile } from "./use-user-profile";

type ProfileTab = "personal" | "work";

export function ProfilePage() {
  const [tab, setTab] = useState<ProfileTab>("personal");
  const { profile, loading, error, updateProfile, workspaceRole, workspaceName } = useUserProfile();

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
        <div className="h-[24rem] animate-pulse rounded-xl bg-muted" />
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
      <AppBar
        title="Profile"
        description="Manage your account and personal information."
        actions={
          <Link
            href="/settings?section=security"
            className="text-sm font-medium text-primary hover:underline"
          >
            Security settings
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-4xl space-y-4">
        <ProfileHero
          profile={profile}
          workspaceRole={workspaceRole}
          workspaceName={workspaceName}
          onUpdateAvatar={async (avatarUrl) => {
            await updateProfile({ avatarUrl });
          }}
        />

        <div className="rounded-xl border border-border bg-muted/25 p-1">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: "personal", label: "Personal Info" },
              { value: "work", label: "Work Details" }
            ]}
            size="md"
            fullWidth
          />
        </div>

        {tab === "personal" ? (
          <PersonalInfoSection
            profile={profile}
            onSave={async (data) => {
              await updateProfile(data);
            }}
          />
        ) : (
          <WorkDetailsSection
            profile={profile}
            onSave={async (data) => {
              await updateProfile(data);
            }}
          />
        )}
      </div>
    </div>
  );
}
