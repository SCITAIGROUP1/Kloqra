"use client";

import type { NotificationChannels } from "@kloqra/contracts";
import { Button, cn } from "@kloqra/ui";

function ChannelToggle({
  label,
  enabled,
  onToggle,
  disabled
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={enabled ? "default" : "outline"}
      disabled={disabled}
      onClick={onToggle}
      className="min-w-[4.5rem]"
    >
      {label}: {enabled ? "On" : "Off"}
    </Button>
  );
}

export function NotificationChannelRow({
  channels,
  onChange,
  disabled
}: {
  channels: NotificationChannels;
  onChange: (next: NotificationChannels) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", disabled && "opacity-60")}>
      <ChannelToggle
        label="In-App"
        enabled={channels.inApp}
        disabled={disabled}
        onToggle={() => onChange({ ...channels, inApp: !channels.inApp })}
      />
      <ChannelToggle
        label="Email"
        enabled={channels.email}
        disabled={disabled}
        onToggle={() => onChange({ ...channels, email: !channels.email })}
      />
    </div>
  );
}
