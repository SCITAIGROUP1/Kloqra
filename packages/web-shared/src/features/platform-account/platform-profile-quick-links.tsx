"use client";

import type { PlatformUserProfileDto } from "@kloqra/contracts";
import { cn } from "@kloqra/ui";
import { Bell, ChevronRight, Monitor, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type QuickLink = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  highlight?: boolean;
};

function QuickLinkCard({ href, icon: Icon, title, description, highlight }: QuickLink) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/20",
        highlight && "border-amber-500/40 bg-amber-500/5"
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight
        className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

export function PlatformProfileQuickLinks({ profile }: { profile: PlatformUserProfileDto }) {
  const links: QuickLink[] = [
    {
      href: "/settings?section=security",
      icon: Shield,
      title: "Security",
      description: profile.twoFactorEnabled
        ? "Password, two-factor authentication, and active sessions."
        : "Enable two-factor authentication and manage sessions.",
      highlight: !profile.twoFactorEnabled
    },
    {
      href: "/settings?section=appearance",
      icon: Monitor,
      title: "Appearance",
      description: "Choose light, dark, or system theme for the console."
    },
    {
      href: "/settings?section=notifications",
      icon: Bell,
      title: "Notifications",
      description: "Control which platform alerts you receive."
    }
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">Account settings</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <QuickLinkCard key={link.href} {...link} />
        ))}
      </div>
    </div>
  );
}
