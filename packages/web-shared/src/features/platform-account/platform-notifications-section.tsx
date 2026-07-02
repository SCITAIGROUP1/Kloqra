"use client";

import {
  platformNotificationKeys,
  resolveEffectivePlatformNotifications,
  type PlatformNotificationKey,
  type PlatformUserProfileDto,
  type ResolvedPlatformNotifications
} from "@kloqra/contracts";
import { Button } from "@kloqra/ui";
import { AlertTriangle, Bell, Building2, Gauge, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { NotificationChannelRow } from "../account/settings/notification-channel-row";
import { SettingsCard } from "../account/settings/settings-card";
import { SettingsSaveBar } from "../account/settings/settings-save-bar";

const ROWS: {
  key: PlatformNotificationKey;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    key: "tenantLifecycle",
    title: "Tenant lifecycle",
    description: "Create, update, suspend, churn, and delete events",
    icon: Building2
  },
  {
    key: "queueFailures",
    title: "Queue failures",
    description: "Background job failures on ops queues",
    icon: Gauge
  },
  {
    key: "subscriptionDrift",
    title: "Subscription drift",
    description: "Stripe vs database subscription mismatches",
    icon: AlertTriangle
  },
  {
    key: "securityAlerts",
    title: "Security alerts",
    description: "Platform security and access events",
    icon: Shield
  }
];

function MasterToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <Button type="button" size="sm" variant={enabled ? "default" : "outline"} onClick={onToggle}>
      {enabled ? "On" : "Off"}
    </Button>
  );
}

export function PlatformNotificationsSection({
  profile,
  onSavePreferences
}: {
  profile: PlatformUserProfileDto;
  onSavePreferences: (prefs: Record<string, unknown>) => Promise<unknown>;
}) {
  const [enabled, setEnabled] = useState(true);
  const [channels, setChannels] = useState<ResolvedPlatformNotifications>(
    resolveEffectivePlatformNotifications(profile.preferences)
  );
  const [saved, setSaved] = useState(channels);
  const [savedEnabled, setSavedEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = resolveEffectivePlatformNotifications(profile.preferences);
    setEnabled(next.enabled);
    setChannels(next);
    setSaved(next);
    setSavedEnabled(next.enabled);
  }, [profile]);

  const isDirty =
    enabled !== savedEnabled ||
    platformNotificationKeys().some(
      (key) => channels[key].inApp !== saved[key].inApp || channels[key].email !== saved[key].email
    );

  async function handleSave() {
    setSaving(true);
    try {
      await onSavePreferences({
        notifications: {
          enabled,
          ...Object.fromEntries(platformNotificationKeys().map((key) => [key, channels[key]]))
        }
      });
      setSaved({ ...channels, enabled });
      setSavedEnabled(enabled);
      toast.success("Notification preferences saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save preferences");
    } finally {
      setSaving(false);
    }
  }

  const visibleRows =
    profile.platformRole === "SUPPORT"
      ? [
          {
            key: "securityAlerts" as const,
            title: "Ticket mentions & security alerts",
            description:
              "Get notified when you are @mentioned in a ticket note or when account events occur",
            icon: Shield
          }
        ]
      : ROWS;

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Bell}
        title="Notifications enabled"
        description="Master switch for all platform alerts"
        action={<MasterToggle enabled={enabled} onToggle={() => setEnabled((value) => !value)} />}
      />

      {visibleRows.map(({ key, title, description, icon: Icon }) => (
        <SettingsCard
          key={key}
          icon={Icon}
          title={title}
          description={description}
          action={
            <NotificationChannelRow
              channels={channels[key]}
              disabled={!enabled}
              onChange={(next) => setChannels((prev) => ({ ...prev, [key]: next }))}
            />
          }
        />
      ))}

      <SettingsSaveBar onSave={() => void handleSave()} saving={saving} disabled={!isDirty} />
    </div>
  );
}
