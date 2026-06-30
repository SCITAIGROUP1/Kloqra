"use client";

import { Button, Input, Label, SearchableSelect, SegmentedControl } from "@kloqra/ui";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AccountSectionFooter } from "./account-section-footer";
import type { useUserProfile } from "./use-user-profile";

const TIMEZONE_OPTIONS = [
  { value: "", label: "Browser default" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern (US)" },
  { value: "America/Chicago", label: "Central (US)" },
  { value: "America/Denver", label: "Mountain (US)" },
  { value: "America/Los_Angeles", label: "Pacific (US)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Asia/Colombo", label: "Colombo" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" }
];

type PreferencesSectionProps = {
  profile: NonNullable<ReturnType<typeof useUserProfile>["profile"]>;
  onSavePreferences: (prefs: Record<string, unknown>) => Promise<unknown>;
};

export function PreferencesSection({ profile, onSavePreferences }: PreferencesSectionProps) {
  const [dailyTargetHours, setDailyTargetHours] = useState(
    String(profile.preferences.dailyTargetHours ?? profile.effectiveDailyTargetHours)
  );
  const [timezone, setTimezone] = useState(profile.preferences.timezone ?? "");
  const [weekStart, setWeekStart] = useState<"monday" | "sunday">(
    profile.preferences.weekStart ?? "monday"
  );
  const [savedSnapshot, setSavedSnapshot] = useState({
    daily: String(profile.preferences.dailyTargetHours ?? profile.effectiveDailyTargetHours),
    timezone: profile.preferences.timezone ?? "",
    weekStart: (profile.preferences.weekStart ?? "monday") as "monday" | "sunday"
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const daily = String(profile.preferences.dailyTargetHours ?? profile.effectiveDailyTargetHours);
    const tz = profile.preferences.timezone ?? "";
    const ws = (profile.preferences.weekStart ?? "monday") as "monday" | "sunday";
    setDailyTargetHours(daily);
    setTimezone(tz);
    setWeekStart(ws);
    setSavedSnapshot({ daily, timezone: tz, weekStart: ws });
  }, [profile]);

  const isDirty =
    dailyTargetHours !== savedSnapshot.daily ||
    timezone !== savedSnapshot.timezone ||
    weekStart !== savedSnapshot.weekStart;

  async function handleSave() {
    const parsed = parseFloat(dailyTargetHours);
    if (Number.isNaN(parsed) || parsed < 0.5 || parsed > 24) {
      toast.error("Daily target must be between 0.5 and 24 hours");
      return;
    }
    setSaving(true);
    try {
      await onSavePreferences({
        dailyTargetHours: parsed,
        timezone: timezone === "" ? null : timezone,
        weekStart
      });
      setSavedSnapshot({ daily: dailyTargetHours, timezone, weekStart });
      toast.success("Preferences saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="daily-target">Daily target (hours)</Label>
          <Input
            id="daily-target"
            type="number"
            min={0.5}
            max={24}
            step={0.5}
            value={dailyTargetHours}
            onChange={(e) => setDailyTargetHours(e.target.value)}
            className="h-10 bg-background"
          />
          <p className="text-xs text-muted-foreground">
            Powers daily progress on Timer and dashboard widgets.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Timezone</Label>
          <SearchableSelect
            value={timezone || "__default__"}
            onValueChange={(v) => setTimezone(v === "__default__" ? "" : v)}
            options={TIMEZONE_OPTIONS.map((tz) => ({
              value: tz.value || "__default__",
              label: tz.label
            }))}
            placeholder="Browser default"
            searchPlaceholder="Search timezones…"
            triggerClassName="h-10 bg-background"
            aria-label="Timezone"
          />
          <p className="text-xs text-muted-foreground">
            Used for timesheet day boundaries.
            {!timezone && (
              <> Using browser timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</>
            )}
          </p>
        </div>

        <div className="space-y-3 sm:col-span-2">
          <Label>Week starts on</Label>
          <div className="w-full max-w-xs">
            <SegmentedControl
              value={weekStart}
              onChange={(v) => setWeekStart(v as "monday" | "sunday")}
              options={[
                { value: "monday", label: "Monday" },
                { value: "sunday", label: "Sunday" }
              ]}
              size="md"
              fullWidth
            />
          </div>
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
