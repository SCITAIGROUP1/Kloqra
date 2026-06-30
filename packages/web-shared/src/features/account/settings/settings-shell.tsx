"use client";

import { AppBar } from "@kloqra/ui";
import type { ReactNode } from "react";
import { SettingsNav, type SettingsNavItem, type SettingsSectionId } from "./settings-nav";

const SECTION_COPY: Record<SettingsSectionId, { title: string; description: string }> = {
  appearance: {
    title: "Appearance",
    description: "Customize how Kloqra looks for you"
  },
  time: {
    title: "Time Settings",
    description: "Configure your timezone and time display preferences"
  },
  notifications: {
    title: "Notifications",
    description: "Manage how you receive notifications"
  },
  security: {
    title: "Security",
    description: "Enhance the security of your account"
  },
  account: {
    title: "Account Preferences",
    description: "Configure your account settings"
  }
};

export function SettingsShell({
  navItems,
  activeSection,
  onSectionChange,
  children
}: {
  navItems: SettingsNavItem[];
  activeSection: SettingsSectionId;
  onSectionChange: (id: SettingsSectionId) => void;
  children: ReactNode;
}) {
  const copy = SECTION_COPY[activeSection];

  return (
    <div className="space-y-6">
      <AppBar title="Settings" description="Manage your preferences and account security." />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 rounded-xl border border-border bg-card p-3 shadow-sm lg:w-56">
          <SettingsNav items={navItems} active={activeSection} onChange={onSectionChange} />
        </aside>

        <section className="min-w-0 flex-1 space-y-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{copy.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}
