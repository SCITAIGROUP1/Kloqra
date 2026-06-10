"use client";

import {
  DEFAULT_STARTUP_PAGE,
  type StartupPagePreference,
  type UserProfileDto
} from "@kloqra/contracts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kloqra/ui";
import { Globe, Home, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useWorkspacesStore } from "../../../../stores/workspaces.store";
import { SettingsCard } from "../settings-card";
import { SettingsSaveBar } from "../settings-save-bar";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" }
];

const STARTUP_OPTIONS: { value: StartupPagePreference; label: string }[] = [
  { value: "dashboard", label: "Dashboard" },
  { value: "timer", label: "Timer" },
  { value: "timesheet", label: "Timesheet" },
  { value: "time-tracker", label: "Time Tracker" }
];

export function AccountPreferencesSection({
  profile,
  onSavePreferences
}: {
  profile: UserProfileDto;
  onSavePreferences: (prefs: Record<string, unknown>) => Promise<unknown>;
}) {
  const workspaces = useWorkspacesStore((s) => s.workspaces);
  const [language, setLanguage] = useState(profile.preferences.language ?? "en");
  const [defaultWorkspaceId, setDefaultWorkspaceId] = useState(
    profile.preferences.defaultWorkspaceId ?? ""
  );
  const [startupPage, setStartupPage] = useState<StartupPagePreference>(
    profile.preferences.startupPage ?? DEFAULT_STARTUP_PAGE
  );
  const [snapshot, setSnapshot] = useState({
    language: profile.preferences.language ?? "en",
    defaultWorkspaceId: profile.preferences.defaultWorkspaceId ?? "",
    startupPage: profile.preferences.startupPage ?? DEFAULT_STARTUP_PAGE
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = {
      language: profile.preferences.language ?? "en",
      defaultWorkspaceId: profile.preferences.defaultWorkspaceId ?? "",
      startupPage: profile.preferences.startupPage ?? DEFAULT_STARTUP_PAGE
    };
    setLanguage(next.language);
    setDefaultWorkspaceId(next.defaultWorkspaceId);
    setStartupPage(next.startupPage);
    setSnapshot(next);
  }, [profile]);

  const isDirty =
    language !== snapshot.language ||
    defaultWorkspaceId !== snapshot.defaultWorkspaceId ||
    startupPage !== snapshot.startupPage;

  async function handleSave() {
    setSaving(true);
    try {
      await onSavePreferences({
        language,
        defaultWorkspaceId: defaultWorkspaceId || undefined,
        startupPage
      });
      setSnapshot({ language, defaultWorkspaceId, startupPage });
      toast.success("Account preferences saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingsCard icon={Globe} title="Language" description="Select your preferred language">
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="h-10 max-w-md bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsCard>

      <SettingsCard
        icon={Monitor}
        title="Default Workspace"
        description="Set your default workspace"
      >
        <Select
          value={defaultWorkspaceId || "__none__"}
          onValueChange={(v) => setDefaultWorkspaceId(v === "__none__" ? "" : v)}
        >
          <SelectTrigger className="h-10 max-w-md bg-background">
            <SelectValue placeholder="Select workspace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Current workspace</SelectItem>
            {workspaces.map((ws) => (
              <SelectItem key={ws.id} value={ws.id}>
                {ws.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsCard>

      <SettingsCard
        icon={Home}
        title="Startup Page"
        description="Choose the page you see when you log in"
      >
        <Select
          value={startupPage}
          onValueChange={(v) => setStartupPage(v as StartupPagePreference)}
        >
          <SelectTrigger className="h-10 max-w-md bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STARTUP_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsCard>

      <SettingsSaveBar onSave={() => void handleSave()} saving={saving} disabled={!isDirty} />
    </div>
  );
}
