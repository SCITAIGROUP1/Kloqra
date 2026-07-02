"use client";

import type { PlatformUserProfileDto } from "@kloqra/contracts";
import { Button, Input, Label } from "@kloqra/ui";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function formatPlatformRole(role: string) {
  if (role === "SUPERADMIN") return "Super Admin";
  return role;
}

export function PlatformPersonalInfoSection({
  profile,
  onSave
}: {
  profile: PlatformUserProfileDto;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(profile.name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile.name);
  }, [profile.name]);

  const isDirty = name.trim() !== profile.name;

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Display name is required");
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-base font-semibold">Personal information</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Update how your name appears across the platform console.
      </p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="platform-name">Display name</Label>
          <Input
            id="platform-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="platform-email">Email address</Label>
          <Input
            id="platform-email"
            value={profile.email}
            disabled
            className="bg-muted/30"
            autoComplete="email"
          />
          <p className="text-xs text-muted-foreground">
            Contact your platform operator to change your sign-in email.
          </p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Platform role</Label>
          <Input
            value={formatPlatformRole(profile.platformRole)}
            disabled
            className="bg-muted/30"
          />
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <Button type="button" onClick={() => void handleSave()} disabled={saving || !isDirty}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
