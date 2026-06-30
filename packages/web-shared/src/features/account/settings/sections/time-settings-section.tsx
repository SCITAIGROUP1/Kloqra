"use client";

import {
  formatUserDateTime,
  type DateFormatPreference,
  type TimeFormatPreference,
  type UserProfileDto
} from "@kloqra/contracts";
import {
  Label,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SegmentedControl
} from "@kloqra/ui";
import { Calendar, Clock, Globe } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SettingsCard } from "../settings-card";
import { SettingsSaveBar } from "../settings-save-bar";

const TIMEZONE_OPTIONS = [
  { value: "", label: "Browser default" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Asia/Colombo", label: "Colombo" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" }
];

const DATE_FORMAT_OPTIONS: { value: DateFormatPreference; label: string }[] = [
  { value: "MDY", label: "MM/DD/YYYY" },
  { value: "DMY", label: "DD/MM/YYYY" },
  { value: "YMD", label: "YYYY-MM-DD" }
];

export function TimeSettingsSection({
  profile,
  onSavePreferences
}: {
  profile: UserProfileDto;
  onSavePreferences: (prefs: Record<string, unknown>) => Promise<unknown>;
}) {
  const [timezone, setTimezone] = useState(profile.preferences.timezone ?? "");
  const [dateFormat, setDateFormat] = useState<DateFormatPreference>(profile.effectiveDateFormat);
  const [timeFormat, setTimeFormat] = useState<TimeFormatPreference>(profile.effectiveTimeFormat);
  const [weekStart, setWeekStart] = useState<"monday" | "sunday">(
    profile.preferences.weekStart ?? "monday"
  );
  const [dailyTargetHours, setDailyTargetHours] = useState(
    String(profile.preferences.dailyTargetHours ?? profile.effectiveDailyTargetHours)
  );
  const [snapshot, setSnapshot] = useState({
    timezone: profile.preferences.timezone ?? "",
    dateFormat: profile.effectiveDateFormat,
    timeFormat: profile.effectiveTimeFormat,
    weekStart: (profile.preferences.weekStart ?? "monday") as "monday" | "sunday",
    daily: String(profile.preferences.dailyTargetHours ?? profile.effectiveDailyTargetHours)
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = {
      timezone: profile.preferences.timezone ?? "",
      dateFormat: profile.effectiveDateFormat,
      timeFormat: profile.effectiveTimeFormat,
      weekStart: (profile.preferences.weekStart ?? "monday") as "monday" | "sunday",
      daily: String(profile.preferences.dailyTargetHours ?? profile.effectiveDailyTargetHours)
    };
    setTimezone(next.timezone);
    setDateFormat(next.dateFormat);
    setTimeFormat(next.timeFormat);
    setWeekStart(next.weekStart);
    setDailyTargetHours(next.daily);
    setSnapshot(next);
  }, [profile]);

  const browserTimezone =
    typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;

  const preview = useMemo(
    () =>
      formatUserDateTime(
        new Date(),
        {
          timezone: timezone || undefined,
          dateFormat,
          timeFormat
        },
        browserTimezone
      ),
    [timezone, dateFormat, timeFormat, browserTimezone]
  );

  const isDirty =
    timezone !== snapshot.timezone ||
    dateFormat !== snapshot.dateFormat ||
    timeFormat !== snapshot.timeFormat ||
    weekStart !== snapshot.weekStart ||
    dailyTargetHours !== snapshot.daily;

  async function handleSave() {
    const parsed = parseFloat(dailyTargetHours);
    if (Number.isNaN(parsed) || parsed < 0.5 || parsed > 24) {
      toast.error("Daily target must be between 0.5 and 24 hours");
      return;
    }
    setSaving(true);
    try {
      await onSavePreferences({
        timezone: timezone === "" ? null : timezone,
        dateFormat,
        timeFormat,
        weekStart,
        dailyTargetHours: parsed
      });
      setSnapshot({
        timezone,
        dateFormat,
        timeFormat,
        weekStart,
        daily: dailyTargetHours
      });
      toast.success("Time & date preferences saved successfully.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save time & date preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingsCard icon={Globe} title="Timezone" description="Select your local timezone">
        <SearchableSelect
          value={timezone || "__default__"}
          onValueChange={(v) => setTimezone(v === "__default__" ? "" : v)}
          options={TIMEZONE_OPTIONS.map((tz) => ({
            value: tz.value || "__default__",
            label: tz.label
          }))}
          placeholder="Browser default"
          searchPlaceholder="Search timezones…"
          triggerClassName="h-10 max-w-md bg-background"
          aria-label="Timezone"
        />
      </SettingsCard>

      <SettingsCard
        icon={Calendar}
        title="Date Format"
        description="Choose how dates are displayed"
      >
        <Select value={dateFormat} onValueChange={(v) => setDateFormat(v as DateFormatPreference)}>
          <SelectTrigger className="h-10 max-w-md bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_FORMAT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsCard>

      <SettingsCard icon={Clock} title="Time Format" description="Choose 12-hour or 24-hour format">
        <div className="max-w-md">
          <SegmentedControl
            value={timeFormat}
            onChange={(v) => setTimeFormat(v as TimeFormatPreference)}
            options={[
              { value: "12h", label: "12-hour (AM/PM)" },
              { value: "24h", label: "24-hour" }
            ]}
            size="md"
            fullWidth
          />
        </div>
      </SettingsCard>

      <SettingsCard
        icon={Calendar}
        title="Week Starts On"
        description="First day of the week in calendar views"
      >
        <div className="max-w-xs">
          <Select value={weekStart} onValueChange={(v) => setWeekStart(v as "monday" | "sunday")}>
            <SelectTrigger className="h-10 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monday">Monday</SelectItem>
              <SelectItem value="sunday">Sunday</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingsCard>

      <SettingsCard icon={Clock} title="Daily Target" description="Hours tracked per day goal">
        <div className="max-w-xs space-y-2">
          <Label htmlFor="daily-target-hours" className="sr-only">
            Daily target hours
          </Label>
          <input
            id="daily-target-hours"
            type="number"
            min={0.5}
            max={24}
            step={0.5}
            value={dailyTargetHours}
            onChange={(e) => setDailyTargetHours(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </SettingsCard>

      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Current Display
        </p>
        <p className="mt-2 text-lg font-semibold tabular-nums">{preview}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Timezone: {timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
        </p>
      </div>

      <SettingsSaveBar onSave={() => void handleSave()} saving={saving} disabled={!isDirty} />
    </div>
  );
}
