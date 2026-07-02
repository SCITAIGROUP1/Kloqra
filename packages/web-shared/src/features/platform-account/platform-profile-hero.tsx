"use client";

import type { PlatformUserProfileDto } from "@kloqra/contracts";
import { Badge, UserAvatar } from "@kloqra/ui";
import { Mail, Shield, ShieldCheck } from "lucide-react";

function formatPlatformRole(role: string) {
  if (role === "SUPERADMIN") return "Super Admin";
  return role;
}

export function PlatformProfileHero({ profile }: { profile: PlatformUserProfileDto }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex min-w-0 items-start gap-4">
        <UserAvatar name={profile.name} size="lg" className="rounded-2xl" />
        <div className="min-w-0 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">{profile.name}</h2>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{profile.email}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              Active
            </Badge>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {formatPlatformRole(profile.platformRole)}
            </Badge>
            {profile.twoFactorEnabled ? (
              <Badge
                variant="outline"
                className="gap-1 text-[10px] font-normal text-emerald-700 dark:text-emerald-400"
              >
                <ShieldCheck className="size-3" aria-hidden />
                2FA enabled
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1 text-[10px] font-normal text-amber-700 dark:text-amber-400"
              >
                <Shield className="size-3" aria-hidden />
                2FA not enabled
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
