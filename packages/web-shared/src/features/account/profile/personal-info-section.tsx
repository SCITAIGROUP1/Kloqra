"use client";

import type { UserProfileDto } from "@kloqra/contracts";
import { Button, Input, Label } from "@kloqra/ui";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function PersonalInfoSection({
  profile,
  onSave
}: {
  profile: UserProfileDto;
  onSave: (data: {
    firstName: string;
    lastName: string;
    phone: string | null;
    location: string | null;
  }) => Promise<void>;
}) {
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setPhone(profile.phone ?? "");
    setLocation(profile.location ?? "");
  }, [profile]);

  const isDirty =
    firstName !== profile.firstName ||
    lastName !== profile.lastName ||
    (phone || null) !== profile.phone ||
    (location || null) !== profile.location;

  async function handleSave() {
    if (!firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        location: location.trim() || null
      });
      toast.success("Personal information saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-base font-semibold">Personal Information</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first-name">First Name</Label>
          <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Last Name</Label>
          <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" value={profile.email} disabled className="bg-muted/30" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <Button type="button" onClick={() => void handleSave()} disabled={saving || !isDirty}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
