"use client";

import {
  adminNotificationKeys,
  memberNotificationKeys,
  resolveEffectiveNotifications,
  type AdminNotificationKey,
  type MemberNotificationKey,
  type NotificationChannels,
  type NotificationPreferenceKey,
  type ResolvedUserNotifications,
  type UserProfileDto
} from "@kloqra/contracts";
import { Button } from "@kloqra/ui";
import {
  AlertTriangle,
  Bell,
  Briefcase,
  CheckSquare,
  ClipboardCheck,
  Clock,
  Download,
  Link2,
  Shield,
  Timer,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { NotificationChannelRow } from "../notification-channel-row";
import { SettingsCard } from "../settings-card";
import { SettingsSaveBar } from "../settings-save-bar";

type SettingsVariant =
  | "member"
  | "admin"
  | "workspace-admin"
  | "project-manager"
  | "tenant-admin-org";

const MEMBER_ROWS: {
  key: MemberNotificationKey;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    key: "workspaceAdded",
    title: "Workspace Access",
    description: "When you are added to or removed from a workspace",
    icon: Users
  },
  {
    key: "projectAssignment",
    title: "Project Assignment",
    description: "When you are assigned to or removed from a project",
    icon: Briefcase
  },
  {
    key: "taskAssignment",
    title: "Task Assignment",
    description: "When you are assigned to or unassigned from a task",
    icon: CheckSquare
  },
  {
    key: "timesheetReminders",
    title: "Timesheet Reminders",
    description: "Reminders to submit timesheets",
    icon: Clock
  },
  {
    key: "timesheetStatus",
    title: "Timesheet Status",
    description: "When your timesheet is approved or rejected",
    icon: ClipboardCheck
  },
  {
    key: "roleChanges",
    title: "Role Changes",
    description: "When your workspace role is updated",
    icon: Shield
  },
  {
    key: "idleTimerAlert",
    title: "Idle Timer Alert",
    description: "When the idle timer is triggered",
    icon: Timer
  },
  {
    key: "jiraSyncUpdates",
    title: "Jira Sync Updates",
    description: "When Jira sync completes",
    icon: Link2
  }
];

const ADMIN_ROWS: {
  key: AdminNotificationKey;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    key: "approvalRequest",
    title: "Approval Requests",
    description: "When a member submits a timesheet for review",
    icon: ClipboardCheck
  },
  {
    key: "memberChanges",
    title: "Team Changes",
    description: "When members join, leave, or change roles",
    icon: Users
  },
  {
    key: "missingTimesheets",
    title: "Missing Timesheets",
    description: "Weekly summary of unsubmitted timesheets",
    icon: ClipboardCheck
  },
  {
    key: "exportSchedule",
    title: "Exports & Backups",
    description: "When a scheduled export or organization data backup/import completes",
    icon: Download
  },
  {
    key: "budgetAlert",
    title: "Budget Alerts",
    description: "When a project approaches or exceeds budget",
    icon: AlertTriangle
  }
];

function MasterToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <Button type="button" size="sm" variant={enabled ? "default" : "outline"} onClick={onToggle}>
      {enabled ? "On" : "Off"}
    </Button>
  );
}

function serializeNotifications(state: ResolvedUserNotifications) {
  const keys = [
    ...memberNotificationKeys(),
    ...adminNotificationKeys()
  ] as NotificationPreferenceKey[];
  return {
    enabled: state.enabled,
    ...Object.fromEntries(keys.map((key) => [key, state[key]]))
  };
}

export function NotificationsSection({
  profile,
  onSavePreferences,
  variant = "member"
}: {
  profile: UserProfileDto;
  onSavePreferences: (prefs: Record<string, unknown>) => Promise<unknown>;
  variant?: SettingsVariant;
}) {
  const initial = resolveEffectiveNotifications(profile.preferences);
  const [state, setState] = useState<ResolvedUserNotifications>(initial);
  const [snapshot, setSnapshot] = useState(JSON.stringify(initial));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = resolveEffectiveNotifications(profile.preferences);
    setState(next);
    setSnapshot(JSON.stringify(next));
  }, [profile]);

  const isDirty = JSON.stringify(state) !== snapshot;
  const rows = useMemo(() => {
    if (variant === "tenant-admin-org") {
      const orgAdminRows = ADMIN_ROWS.filter(
        (row) => row.key === "memberChanges" || row.key === "exportSchedule"
      );
      const personalOrgRows = MEMBER_ROWS.filter(
        (row) => row.key === "workspaceAdded" || row.key === "roleChanges"
      );
      return [...personalOrgRows, ...orgAdminRows];
    }
    if (variant === "project-manager") {
      const pmAdminRows = ADMIN_ROWS.filter(
        (row) =>
          row.key === "approvalRequest" ||
          row.key === "budgetAlert" ||
          row.key === "missingTimesheets"
      );
      return [...MEMBER_ROWS, ...pmAdminRows];
    }
    if (variant === "workspace-admin") {
      return [...MEMBER_ROWS, ...ADMIN_ROWS];
    }
    if (variant === "admin") {
      return ADMIN_ROWS;
    }
    return MEMBER_ROWS;
  }, [variant]);

  function updateKey(key: NotificationPreferenceKey, channels: NotificationChannels) {
    setState((prev) => ({ ...prev, [key]: channels }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSavePreferences({ notifications: serializeNotifications(state) });
      setSnapshot(JSON.stringify(state));
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
        description="Master switch for all notifications"
        action={
          <MasterToggle
            enabled={state.enabled}
            onToggle={() => setState((s) => ({ ...s, enabled: !s.enabled }))}
          />
        }
      />

      {rows.map(({ key, title, description, icon: Icon }) => (
        <SettingsCard
          key={key}
          icon={Icon}
          title={title}
          description={description}
          action={
            <NotificationChannelRow
              channels={state[key]}
              disabled={!state.enabled}
              onChange={(channels) => updateKey(key, channels)}
            />
          }
        />
      ))}

      <SettingsSaveBar onSave={() => void handleSave()} saving={saving} disabled={!isDirty} />
    </div>
  );
}
