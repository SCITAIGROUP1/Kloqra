"use client";

import type { UserProfileDto } from "@kloqra/contracts";
import { Badge, Button, Input, Label } from "@kloqra/ui";
import { Briefcase, Mail, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileHero({
  profile,
  workspaceRole,
  workspaceName,
  onUpdateAvatar
}: {
  profile: UserProfileDto;
  workspaceRole?: string;
  workspaceName?: string;
  onUpdateAvatar: (avatarUrl: string | null) => Promise<void>;
}) {
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSavePhoto() {
    setSaving(true);
    try {
      await onUpdateAvatar(avatarUrl.trim() || null);
      setEditingPhoto(false);
      toast.success("Profile photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update photo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="size-16 shrink-0 rounded-2xl object-cover"
            />
          ) : (
            <div
              className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-semibold text-primary-foreground shadow-md shadow-primary/25"
              aria-hidden
            >
              {getInitials(profile.name)}
            </div>
          )}
          <div className="min-w-0 space-y-2">
            <h1 className="text-xl font-semibold tracking-tight">{profile.name}</h1>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{profile.email}</span>
            </p>
            {profile.department ? (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Briefcase className="size-3.5 shrink-0" aria-hidden />
                {profile.department}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                Active
              </Badge>
              {workspaceRole ? (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {workspaceRole}
                </Badge>
              ) : null}
              {workspaceName ? (
                <Badge variant="outline" className="text-[10px] font-normal">
                  {workspaceName}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setEditingPhoto((v) => !v)}
        >
          <Pencil className="size-3.5" aria-hidden />
          Edit Photo
        </Button>
      </div>

      {editingPhoto ? (
        <div className="mt-5 space-y-3 border-t border-border pt-5">
          <div className="space-y-2">
            <Label htmlFor="avatar-url">Photo URL</Label>
            <Input
              id="avatar-url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="max-w-lg"
            />
          </div>
          <Button type="button" size="sm" disabled={saving} onClick={() => void handleSavePhoto()}>
            {saving ? "Saving…" : "Save photo"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
