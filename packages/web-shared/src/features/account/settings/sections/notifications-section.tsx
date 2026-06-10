"use client";

import {
  resolveEffectiveNotifications,
  type ResolvedUserNotifications,
  type UserProfileDto
} from "@kloqra/contracts";
import { Button } from "@kloqra/ui";
import { Bell, Briefcase, CheckSquare, Clock, Link2, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SettingsCard } from "../settings-card";
import { SettingsSaveBar } from "../settings-save-bar";

type NotificationTypeKey = keyof Omit<ResolvedUserNotifications, "enabled">;

const ROWS: {
  key: NotificationTypeKey;
  title: string;
  description: string;
  icon: typeof Bell;
}[] = [
  {
    key: "projectAssignment",
    title: "Project Assignment",
    description: "Email when you are assigned to a project",
    icon: Briefcase
  },
  {
    key: "taskAssignment",
    title: "Task Assignment",
    description: "Email when you are assigned to a task",
    icon: CheckSquare
  },
  {
    key: "timesheetReminders",
    title: "Timesheet Reminders",
    description: "Email reminders to submit timesheets",
    icon: Clock
  },
  {
    key: "idleTimerAlert",
    title: "Idle Timer Alert",
    description: "Email when the idle timer is triggered",
    icon: Timer
  },
  {
    key: "jiraSyncUpdates",
    title: "Jira Sync Updates",
    description: "Email when Jira sync completes",
    icon: Link2
  }
];

function NotificationToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <Button type="button" size="sm" variant={enabled ? "default" : "outline"} onClick={onToggle}>
      {enabled ? "On" : "Off"}
    </Button>
  );
}

export function NotificationsSection({
  profile,
  onSavePreferences
}: {
  profile: UserProfileDto;
  onSavePreferences: (prefs: Record<string, unknown>) => Promise<unknown>;
}) {
  const initial = resolveEffectiveNotifications(profile.preferences);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [types, setTypes] = useState<ResolvedUserNotifications>(initial);
  const [snapshot, setSnapshot] = useState(JSON.stringify(initial));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = resolveEffectiveNotifications(profile.preferences);
    setEnabled(next.enabled);
    setTypes(next);
    setSnapshot(JSON.stringify(next));
  }, [profile]);

  const isDirty = JSON.stringify({ ...types, enabled }) !== snapshot;

  function toggleType(key: NotificationTypeKey) {
    setTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSavePreferences({
        notifications: {
          enabled,
          projectAssignment: types.projectAssignment,
          taskAssignment: types.taskAssignment,
          timesheetReminders: types.timesheetReminders,
          idleTimerAlert: types.idleTimerAlert,
          jiraSyncUpdates: types.jiraSyncUpdates
        }
      });
      setSnapshot(JSON.stringify({ ...types, enabled }));
      toast.success("Notification preferences saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save notifications");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Bell}
        title="Notifications Enabled"
        description="Master switch for all email notifications"
        action={<NotificationToggle enabled={enabled} onToggle={() => setEnabled((v) => !v)} />}
      />

      {ROWS.map(({ key, title, description, icon: Icon }) => (
        <SettingsCard
          key={key}
          icon={Icon}
          title={title}
          description={description}
          action={<NotificationToggle enabled={types[key]} onToggle={() => toggleType(key)} />}
        />
      ))}

      <SettingsSaveBar onSave={() => void handleSave()} saving={saving} disabled={!isDirty} />
    </div>
  );
}
