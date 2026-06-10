"use client";

import { DEFAULT_THEME, type ThemePreference, type UserProfileDto } from "@kloqra/contracts";
import { cn } from "@kloqra/ui";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { markThemeHydrated } from "../../../../hooks/theme-preference-state";
import { useSessionStore } from "../../../../stores/session.store";
import { SettingsSaveBar } from "../settings-save-bar";

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
  Icon: typeof Sun;
}[] = [
  { value: "light", label: "Light", description: "Bright and clean", Icon: Sun },
  { value: "dark", label: "Dark", description: "Easy on the eyes", Icon: Moon },
  { value: "system", label: "System", description: "Matches your device", Icon: Monitor }
];

export function AppearanceSection({
  profile,
  onSavePreferences
}: {
  profile: UserProfileDto;
  onSavePreferences: (prefs: Record<string, unknown>) => Promise<unknown>;
}) {
  const { setTheme } = useTheme();
  const userId = useSessionStore((s) => s.session?.user?.id);
  const [theme, setThemeChoice] = useState<ThemePreference>(
    profile.preferences.theme ?? profile.effectiveTheme ?? DEFAULT_THEME
  );
  const [savedTheme, setSavedTheme] = useState(theme);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = profile.preferences.theme ?? profile.effectiveTheme ?? DEFAULT_THEME;
    setThemeChoice(next);
    setSavedTheme(next);
  }, [profile]);

  const isDirty = theme !== savedTheme;

  async function handleSave() {
    setSaving(true);
    try {
      await onSavePreferences({ theme });
      setTheme(theme);
      if (userId) markThemeHydrated(userId);
      setSavedTheme(theme);
      toast.success("Appearance saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save appearance");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {THEME_OPTIONS.map(({ value, label, description, Icon }) => {
          const selected = theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                setThemeChoice(value);
                setTheme(value);
              }}
              className={cn(
                "relative flex flex-col items-center gap-3 rounded-xl border-2 bg-card p-6 text-center transition-colors",
                selected ? "border-primary shadow-sm" : "border-border hover:border-primary/40"
              )}
            >
              {selected ? (
                <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" aria-hidden />
                </span>
              ) : null}
              <Icon className="size-8 text-muted-foreground" aria-hidden />
              <div>
                <p className="font-semibold">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Live Preview
        </p>
        <p className="mt-2 text-sm">Current theme: {theme}</p>
        <div className="mt-3 flex gap-2">
          <span className="size-6 rounded-md bg-primary" />
          <span className="size-6 rounded-md border border-border bg-background" />
          <span className="size-6 rounded-md bg-muted" />
        </div>
      </div>

      <SettingsSaveBar onSave={() => void handleSave()} saving={saving} disabled={!isDirty} />
    </div>
  );
}
