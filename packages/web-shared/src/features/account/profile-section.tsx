"use client";

import { Button, Input, Label } from "@kloqra/ui";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AccountSectionFooter } from "./account-section-footer";
import type { useUserProfile } from "./use-user-profile";

type ProfileSectionProps = {
  profile: NonNullable<ReturnType<typeof useUserProfile>["profile"]>;
  onSaveName: (name: string) => Promise<unknown>;
};

export function ProfileSection({ profile, onSaveName }: ProfileSectionProps) {
  const [name, setName] = useState(profile.name);
  const [saving, setSaving] = useState(false);
  const isDirty = name.trim() !== profile.name;

  useEffect(() => {
    setName(profile.name);
  }, [profile.name]);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      await onSaveName(trimmed);
      toast.success("Display name updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="max-w-xl space-y-5">
        <div className="space-y-2">
          <Label htmlFor="profile-name">Display name</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="h-10 bg-background"
            placeholder="Your name"
          />
          <p className="text-xs text-muted-foreground">Shown in the sidebar and on timesheets.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-email">Email address</Label>
          <Input
            id="profile-email"
            value={profile.email}
            disabled
            className="h-10 bg-muted/30 text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Contact your admin to change your login email.
          </p>
        </div>
      </div>

      <AccountSectionFooter>
        <Button
          onClick={() => void handleSave()}
          disabled={saving || !isDirty}
          className="min-w-[128px]"
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </AccountSectionFooter>
    </div>
  );
}
