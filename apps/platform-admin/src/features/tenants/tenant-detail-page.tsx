"use client";

import { ROUTES, type PlatformTenantDetailDto } from "@kloqra/contracts";
import {
  AppBar,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CenteredLoader,
  DashboardStatCard,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import { api, CopyableValue, usePlatformPlans, usePlatformTenantDetail } from "@kloqra/web-shared";
import { Activity, CreditCard, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatTenantStatusLabel, tenantStatusTone } from "./tenant-labels";
import { TenantSalesInquiriesCard } from "./tenant-sales-inquiries-card";

function syncPlanId(
  tenant: PlatformTenantDetailDto,
  plans: ReturnType<typeof usePlatformPlans>["plans"]
) {
  return plans.find((plan) => plan.slug === tenant.planSlug)?.id ?? "";
}

export function TenantDetailPage({ tenantId }: { tenantId: string }) {
  const { plans } = usePlatformPlans();
  const { tenant, setTenant, loading, error } = usePlatformTenantDetail(tenantId);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [planId, setPlanId] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!tenant) return;
    setName(tenant.name);
    setSlug(tenant.slug);
    setPlanId(syncPlanId(tenant, plans));
  }, [tenant, plans]);

  async function patchTenant(body: Record<string, unknown>) {
    setSaving(true);
    setActionMessage("");
    setActionError("");
    try {
      const updated = await api<PlatformTenantDetailDto>(ROUTES.PLATFORM.TENANT(tenantId), {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      setTenant(updated);
      setName(updated.name);
      setSlug(updated.slug);
      setPlanId(syncPlanId(updated, plans));
      setActionMessage("Organization updated.");
    } catch {
      setActionError("Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function suspendTenant() {
    setSaving(true);
    setActionError("");
    try {
      const updated = await api<PlatformTenantDetailDto>(ROUTES.PLATFORM.SUSPEND_TENANT(tenantId), {
        method: "POST"
      });
      setTenant(updated);
      setActionMessage("Organization suspended.");
    } catch {
      setActionError("Could not suspend organization.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTenantPermanently() {
    if (
      !window.confirm(
        "Permanently delete this organization and all data? This cannot be undone. Export must be completed or waived and retention period must have elapsed."
      )
    ) {
      return;
    }
    setSaving(true);
    setActionError("");
    try {
      await api(ROUTES.PLATFORM.TENANT_DELETE(tenantId), { method: "DELETE" });
      window.location.assign("/tenants");
    } catch {
      setActionError("Delete failed. Check export, churn, and retention preconditions.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <CenteredLoader label="Loading organization…" />;
  }

  if (error || !tenant) {
    return (
      <div className="p-6 text-sm text-destructive">{error ?? "Organization unavailable"}</div>
    );
  }

  const subscriptionHint = tenant.subscription
    ? [
        formatTenantStatusLabel(tenant.subscription.status),
        tenant.subscription.billingAlert ? tenant.subscription.billingAlert : null
      ]
        .filter(Boolean)
        .join(" · ")
    : "No subscription";

  const planHint = tenant.subscription
    ? [
        tenant.subscription.status === "trial"
          ? `Trial ends: ${tenant.subscription.trialEndsAt ? new Date(tenant.subscription.trialEndsAt).toLocaleDateString() : "—"}`
          : `Renews: ${tenant.subscription.currentPeriodEnd ? new Date(tenant.subscription.currentPeriodEnd).toLocaleDateString() : "—"}`,
        tenant.subscription.billingInterval ? tenant.subscription.billingInterval : null
      ]
        .filter(Boolean)
        .join(" · ")
    : "No active subscription";

  return (
    <div className="space-y-6">
      <AppBar
        title={tenant.name}
        description="Organization account on Kloqra."
        actions={
          <Link href="/tenants" className="text-sm text-primary hover:underline">
            Back to tenants
          </Link>
        }
      />

      <div className="mx-auto max-w-6xl space-y-6">
        {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
        {actionMessage ? <p className="text-sm text-muted-foreground">{actionMessage}</p> : null}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <DashboardStatCard
                label="Status"
                value={formatTenantStatusLabel(tenant.status)}
                hint={subscriptionHint}
                icon={Activity}
                tone={tenantStatusTone(tenant.status)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <DashboardStatCard
                label="Plan"
                value={tenant.subscription?.planName ?? tenant.planSlug ?? "—"}
                hint={planHint}
                icon={CreditCard}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <DashboardStatCard
                label="Members"
                value={String(tenant.memberCount)}
                hint={`${tenant.workspaceCount} workspace${tenant.workspaceCount === 1 ? "" : "s"}`}
                icon={Users}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization profile</CardTitle>
            <CardDescription>Name, slug, plan assignment, and owner contact.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <CopyableValue
                label="Organization ID"
                value={tenant.slug}
                testId="copy-tenant-slug"
              />
              {tenant.ownerEmail ? (
                <CopyableValue
                  label="Owner email"
                  value={tenant.ownerEmail}
                  testId="copy-tenant-owner-email"
                />
              ) : (
                <div className="text-sm">
                  <span className="text-muted-foreground">Owner email</span>
                  <p className="mt-1">—</p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Created {new Date(tenant.createdAt).toLocaleString()}
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tenant-name">Display name</Label>
                <Input id="tenant-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-slug">Organization ID</Label>
                <Input
                  id="tenant-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-id">Plan</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger id="plan-id">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={saving}
                onClick={() =>
                  void patchTenant({
                    name: name.trim(),
                    slug: slug.trim(),
                    ...(planId ? { planId } : {})
                  })
                }
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <TenantSalesInquiriesCard tenantId={tenantId} />

        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-base">Account status</CardTitle>
            <CardDescription>
              Suspend access, mark churned after offboarding, or permanently delete when retention
              allows.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {tenant.status !== "suspended" && tenant.status !== "churned" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={saving}
                onClick={() => void suspendTenant()}
              >
                Suspend organization
              </Button>
            ) : null}
            {tenant.status === "suspended" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() =>
                    void patchTenant({ status: "active", subscriptionStatus: "active" })
                  }
                >
                  Reactivate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => void patchTenant({ status: "churned" })}
                >
                  Mark churned
                </Button>
              </>
            ) : null}
            {tenant.status === "churned" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={saving}
                onClick={() => void deleteTenantPermanently()}
                data-testid="platform-delete-tenant"
              >
                Delete permanently
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
