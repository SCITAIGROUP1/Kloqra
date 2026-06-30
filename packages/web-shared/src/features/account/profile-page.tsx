"use client";

import { ROUTES } from "@kloqra/contracts";
import { AppBar, Card, CardContent, SegmentedControl, Skeleton } from "@kloqra/ui";
import Link from "next/link";
import { useState } from "react";
import { api } from "../../api/client";
import { getWorkspaceId, useSessionStore } from "../../stores/session.store";
import { IntegrationsSection } from "./profile/integrations-section";
import { PersonalInfoSection } from "./profile/personal-info-section";
import { ProfileHero } from "./profile/profile-hero";
import { WorkDetailsSection } from "./profile/work-details-section";
import { useUserProfile } from "./use-user-profile";

type ProfileTab = "personal" | "work" | "integrations";

export function ProfilePage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [tab, setTab] = useState<ProfileTab>("personal");
  const { profile, loading, error, updateProfile, setProfile, workspaceRole, workspaceName } =
    useUserProfile();

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-[24rem] rounded-xl" />
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
        />

        <div className="rounded-xl border border-border bg-muted/25 p-1">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: "personal", label: "Personal Info" },
              { value: "work", label: "Work Details" },
              { value: "integrations", label: "Integrations" }
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
        ) : tab === "work" ? (
          <WorkDetailsSection
            profile={profile}
            onSave={async (data) => {
              await updateProfile(data);
            }}
          />
        ) : (
          <IntegrationsSection
            profile={profile}
            onSave={async (data) => {
              const updated = await api<typeof profile>(ROUTES.JIRA.CREDENTIALS, {
                method: "PATCH",
                workspaceId: ws,
                body: JSON.stringify(data)
              });
              if (typeof updated === "object" && updated && "jiraEmail" in updated) {
                setProfile({ ...profile, ...updated });
              } else {
                setProfile({ ...profile, jiraEmail: data.jiraEmail ?? null });
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
