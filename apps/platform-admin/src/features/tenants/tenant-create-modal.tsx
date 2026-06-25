"use client";

import {
  createPlatformTenantSchema,
  ROUTES,
  type CreatePlatformTenantDto,
  type CreatePlatformTenantResponseDto
} from "@kloqra/contracts";
import { AppModal, Button, Input, Label, SearchableSelect } from "@kloqra/ui";
import { api, usePlatformPlans } from "@kloqra/web-shared";
import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type TenantCreateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
};

export function TenantCreateModal({ open, onOpenChange, onCreated }: TenantCreateModalProps) {
  const router = useRouter();
  const { plans, loading: plansLoading } = usePlatformPlans();
  const [organizationName, setOrganizationName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [tenantAdminEmail, setTenantAdminEmail] = useState("");
  const [planId, setPlanId] = useState("");
  const [trial, setTrial] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedPlanId = planId || plans[0]?.id || "";

  const planOptions = useMemo(
    () =>
      plans.map((plan) => ({
        value: plan.id,
        label: plan.name,
        keywords: `${plan.name} ${plan.slug}`
      })),
    [plans]
  );

  useEffect(() => {
    if (!open) return;
    setOrganizationName("");
    setOwnerEmail("");
    setOwnerName("");
    setTenantAdminEmail("");
    setPlanId("");
    setTrial(true);
    setError("");
    setSaving(false);
  }, [open]);

  const payload = useMemo((): CreatePlatformTenantDto | null => {
    const body: CreatePlatformTenantDto = {
      organizationName: organizationName.trim(),
      ownerEmail: ownerEmail.trim(),
      planId: selectedPlanId,
      subscriptionStatus: trial ? "trial" : "active",
      ...(ownerName.trim() ? { ownerName: ownerName.trim() } : {}),
      ...(tenantAdminEmail.trim() ? { tenantAdminEmail: tenantAdminEmail.trim() } : {})
    };
    const parsed = createPlatformTenantSchema.safeParse(body);
    return parsed.success ? parsed.data : null;
  }, [organizationName, ownerEmail, ownerName, selectedPlanId, tenantAdminEmail, trial]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!payload) {
      setError("Fill in organization name, owner email, and plan.");
      return;
    }
    setSaving(true);
    try {
      const result = await api<CreatePlatformTenantResponseDto>(ROUTES.PLATFORM.TENANTS, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      onOpenChange(false);
      onCreated?.();
      router.push(`/tenants/${result.tenant.id}`);
    } catch {
      setError("Failed to create tenant.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Create tenant"
      description="Provision a new organization, owner account, and optional tenant admin."
      icon={<Building2 className="h-5 w-5" />}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" form="tenant-create-form" disabled={saving || !payload}>
            {saving ? "Creating…" : "Create tenant"}
          </Button>
        </div>
      }
    >
      <form id="tenant-create-form" onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="org-name">Organization name</Label>
          <Input
            id="org-name"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="owner-email">Owner email</Label>
          <Input
            id="owner-email"
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="owner-name">Owner name (optional)</Label>
          <Input id="owner-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenant-admin-email">Tenant admin email (optional)</Label>
          <Input
            id="tenant-admin-email"
            type="email"
            value={tenantAdminEmail}
            onChange={(e) => setTenantAdminEmail(e.target.value)}
            placeholder="delegate@company.com"
          />
          <p className="text-xs text-muted-foreground">
            Creates an organization admin account separate from the owner.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan">Plan</Label>
          <SearchableSelect
            id="plan"
            value={selectedPlanId}
            onValueChange={setPlanId}
            options={planOptions}
            placeholder={plansLoading ? "Loading plans…" : "Select plan"}
            searchPlaceholder="Search plans…"
            emptyMessage="No plans found."
            disabled={plansLoading || planOptions.length === 0}
            aria-label="Plan"
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            id="trial"
            type="checkbox"
            checked={trial}
            onChange={(e) => setTrial(e.target.checked)}
            className="h-4 w-4 rounded border border-input"
          />
          <div>
            <Label htmlFor="trial">Start on trial</Label>
            <p className="text-xs text-muted-foreground">
              Otherwise subscription is active immediately.
            </p>
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </form>
    </AppModal>
  );
}
