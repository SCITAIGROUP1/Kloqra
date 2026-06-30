"use client";

import { cn } from "@kloqra/ui";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SettingsSectionId = "appearance" | "time" | "notifications" | "security" | "account";

export type SettingsNavItem = {
  id: SettingsSectionId;
  label: string;
  icon: LucideIcon;
};

export function SettingsNav({
  items,
  active,
  onChange
}: {
  items: SettingsNavItem[];
  active: SettingsSectionId;
  onChange: (id: SettingsSectionId) => void;
}) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Settings">
      {items.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="flex-1">{label}</span>
            {isActive ? <ChevronRight className="size-4 shrink-0" aria-hidden /> : null}
          </button>
        );
      })}
    </nav>
  );
}
