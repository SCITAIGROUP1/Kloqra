"use client";

import {
  ROUTES,
  type ExtendPlatformTenantTrialResponseDto,
  type PlatformTenantSubscriptionSummaryDto
} from "@kloqra/contracts";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DatePicker,
  Label
} from "@kloqra/ui";
import { api } from "@kloqra/web-shared";
import { useMemo, useState } from "react";
import { previewTrialEndsAtFromDays } from "./trial-extend.util";

const PRESET_DAYS = [7, 14, 30] as const;
const MAX_TRIAL_EXTEND_DAYS = 365;

function maxTrialEndDateKey(now = new Date()): string {
  const max = new Date(now);
  max.setDate(max.getDate() + MAX_TRIAL_EXTEND_DAYS);
  const y = max.getFullYear();
  const m = String(max.getMonth() + 1).padStart(2, "0");
  const d = String(max.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type TenantTrialExtendCardProps = {
  tenantId: string;
  subscription: Pick<PlatformTenantSubscriptionSummaryDto, "status" | "trialEndsAt">;
  disabled?: boolean;
  onExtended?: (result: ExtendPlatformTenantTrialResponseDto) => void;
};

export function TenantTrialExtendCard({
  tenantId,
  subscription,
  disabled = false,
  onExtended
}: TenantTrialExtendCardProps) {
  const [customDate, setCustomDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const maxDate = useMemo(() => maxTrialEndDateKey(), []);

  const trialLabel = useMemo(() => {
    if (!subscription.trialEndsAt) return "No trial end date";
    const end = new Date(subscription.trialEndsAt);
    const expired = end.getTime() < Date.now();
    return `${expired ? "Expired" : "Ends"} ${end.toLocaleDateString()}`;
  }, [subscription.trialEndsAt]);

  if (subscription.status === "canceled") {
    return null;
  }

  async function extend(body: { extendDays: number } | { trialEndsAt: string }) {
    const preview =
      "extendDays" in body
        ? previewTrialEndsAtFromDays(subscription.trialEndsAt, body.extendDays)
        : new Date(body.trialEndsAt);

    if (
      !window.confirm(
        `Extend trial? New trial ends ${preview.toLocaleString()}. Subscription status will be set to trial.`
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await api<ExtendPlatformTenantTrialResponseDto>(
        ROUTES.PLATFORM.TENANT_EXTEND_TRIAL(tenantId),
        {
          method: "POST",
          body: JSON.stringify(body)
        }
      );
      setMessage(
        `Trial extended. New end: ${new Date(result.subscription.trialEndsAt!).toLocaleString()}`
      );
      onExtended?.(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not extend trial.");
    } finally {
      setSaving(false);
    }
  }

  async function submitCustomDate() {
    if (!customDate) {
      setError("Choose a date.");
      return;
    }
    const trialEndsAt = new Date(`${customDate}T23:59:59.000Z`).toISOString();
    await extend({ trialEndsAt });
  }

  return (
    <Card data-testid="tenant-trial-extend-card">
      <CardHeader>
        <CardTitle className="text-base">Trial</CardTitle>
        <CardDescription>
          Extend the organization trial with presets or a custom end date. Status becomes trial.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm" data-testid="tenant-trial-current-end">
          <span className="text-muted-foreground">Current: </span>
          {trialLabel}
          {subscription.status !== "trial" ? (
            <span className="text-muted-foreground"> · status {subscription.status}</span>
          ) : null}
        </p>

        <div className="flex flex-wrap gap-2">
          {PRESET_DAYS.map((days) => (
            <Button
              key={days}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || saving}
              data-testid={`extend-trial-${days}`}
              onClick={() => void extend({ extendDays: days })}
            >
              +{days} days
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-2">
            <Label>Custom end date</Label>
            <div data-testid="extend-trial-custom-date">
              <DatePicker
                value={customDate}
                onChange={setCustomDate}
                placeholder="Select end date"
                ariaLabel="Custom trial end date"
                disabled={disabled || saving}
                maxDate={maxDate}
                className="h-10 w-[220px] justify-start bg-background"
                popoverAlign="start"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || saving || !customDate}
            data-testid="extend-trial-set-date"
            onClick={() => void submitCustomDate()}
          >
            {saving ? "Saving…" : "Set end date"}
          </Button>
        </div>

        {error ? (
          <p className="text-sm text-destructive" data-testid="extend-trial-error">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-muted-foreground" data-testid="extend-trial-message">
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
