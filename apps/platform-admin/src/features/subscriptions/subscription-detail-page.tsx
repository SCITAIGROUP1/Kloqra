"use client";

import { ROUTES } from "@kloqra/contracts";
import {
  AppModal,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CenteredLoader,
  Label,
  SearchableSelect
} from "@kloqra/ui";
import { usePlatformSubscriptionDetail, usePlatformPlans, api } from "@kloqra/web-shared";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Copy,
  Cpu,
  CreditCard,
  ExternalLink,
  FileText,
  HelpCircle,
  RefreshCw,
  Settings,
  Shield,
  User,
  Users
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type SubscriptionDetailPageProps = {
  tenantId: string;
};

export function SubscriptionDetailPage({ tenantId }: SubscriptionDetailPageProps) {
  const { subscription, loading, error, reload } = usePlatformSubscriptionDetail(tenantId);
  const { plans } = usePlatformPlans();

  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Manual plan assignment modal inside details page as well
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [assignError, setAssignError] = useState("");
  const [assigning, setAssigning] = useState(false);

  const planOptions = useMemo(
    () =>
      plans.map((plan) => ({
        value: plan.id,
        label: `${plan.name} (${plan.slug})`,
        keywords: `${plan.name} ${plan.slug}`
      })),
    [plans]
  );

  const handleCopy = (text: string, field: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const openAssignPlanModal = () => {
    if (!subscription) return;
    setSelectedPlanId(subscription.planId);
    setAssignError("");
    setAssignModalOpen(true);
  };

  const handleAssignPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) return;
    setAssignError("");
    setAssigning(true);
    try {
      await api(ROUTES.PLATFORM.TENANT(tenantId), {
        method: "PATCH",
        body: JSON.stringify({ planId: selectedPlanId })
      });
      setAssignModalOpen(false);
      void reload();
    } catch (e: any) {
      setAssignError(e instanceof Error ? e.message : "Failed to assign plan.");
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return <CenteredLoader label="Loading subscription details..." />;
  }

  if (error || !subscription) {
    return (
      <div className="space-y-6">
        <Link
          href="/subscriptions"
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to subscriptions
        </Link>
        <p className="text-sm text-destructive">{error ?? "Subscription not found"}</p>
      </div>
    );
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
      case "trial":
        return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
      case "past_due":
        return "bg-rose-500/10 text-rose-500 border border-rose-500/20";
      case "suspended":
        return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      case "canceled":
        return "bg-gray-500/10 text-gray-500 border border-gray-500/20";
      default:
        return "bg-muted text-muted-foreground border border-border";
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "created":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "plan_changed":
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case "status_changed":
        return <Settings className="h-4 w-4 text-amber-500" />;
      case "period_renewed":
        return <Calendar className="h-4 w-4 text-indigo-500" />;
      case "canceled":
        return <FileText className="h-4 w-4 text-gray-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActorLabel = (actorType: string, actorId: string | null) => {
    switch (actorType) {
      case "system":
        return (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Cpu className="h-3 w-3" /> System automated
          </span>
        );
      case "platform_user":
        return (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" /> Staff User {actorId ? `(${actorId.slice(0, 8)})` : ""}
          </span>
        );
      case "tenant_owner":
        return (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" /> Tenant Owner {actorId ? `(${actorId.slice(0, 8)})` : ""}
          </span>
        );
      default:
        return <span className="text-xs text-muted-foreground">Unknown Actor</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Link
            href="/subscriptions"
            className="flex items-center gap-2 text-sm text-primary hover:underline mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to subscriptions
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{subscription.tenantName}</h1>
            <span
              className={`px-2 py-1 text-xs rounded-full font-semibold ${getStatusStyle(subscription.status)}`}
            >
              {subscription.status.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            Tenant ID: {subscription.tenantId}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/tenants/${subscription.tenantId}`}>View Org Profile</Link>
          </Button>
          <Button variant="default" onClick={openAssignPlanModal}>
            Change / Assign Plan
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Core Billing Parameters */}
        <Card className="md:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Subscription Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Current Plan
                </span>
                <span className="text-base font-medium block mt-1">{subscription.planName}</span>
                <span className="text-xs text-muted-foreground font-mono mt-0.5 block">
                  {subscription.planSlug}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Billing Tenure
                </span>
                <span className="text-sm block mt-1 capitalize">
                  {subscription.billingInterval ?? "No recurring cycle"}
                </span>
                <span className="text-xs text-muted-foreground block mt-0.5">
                  Assigned {new Date(subscription.planAssignedAt).toLocaleDateString()} (
                  {subscription.daysOnPlan} days ago)
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Billing Source
                </span>
                <span className="text-sm font-semibold capitalize block mt-1">
                  {subscription.billingSource}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Period Boundaries
                </span>
                {subscription.currentPeriodStart || subscription.currentPeriodEnd ? (
                  <div className="text-sm mt-1 space-y-1">
                    {subscription.currentPeriodStart ? (
                      <div>
                        <span className="text-muted-foreground">Start:</span>{" "}
                        {new Date(subscription.currentPeriodStart).toLocaleDateString()}
                      </div>
                    ) : null}
                    {subscription.currentPeriodEnd ? (
                      <div>
                        <span className="text-muted-foreground font-semibold">Ends/Renews:</span>{" "}
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground mt-1 block">—</span>
                )}
              </div>

              {subscription.trialEndsAt ? (
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Trial Period
                  </span>
                  <span className="text-sm block mt-1">
                    Ends {new Date(subscription.trialEndsAt).toLocaleDateString()}
                  </span>
                </div>
              ) : null}

              {subscription.limitsOverride ? (
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Limits Overrides
                  </span>
                  <div className="mt-1 text-xs font-mono bg-muted p-2.5 rounded-lg border border-border/40 overflow-x-auto max-w-full">
                    <pre>{JSON.stringify(subscription.limitsOverride, null, 2)}</pre>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Integration Details (Stripe) */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-indigo-500" /> Stripe Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase block">
                Customer ID
              </span>
              {subscription.stripeCustomerId ? (
                <div className="flex items-center justify-between mt-1 gap-2 bg-muted/50 p-2 rounded-lg border border-border/40">
                  <span className="text-xs font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                    {subscription.stripeCustomerId}
                  </span>
                  <button
                    onClick={() => handleCopy(subscription.stripeCustomerId!, "cust")}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground mt-1 block">
                  No Stripe customer linked
                </span>
              )}
              {copiedField === "cust" ? (
                <span className="text-[10px] text-emerald-500 mt-1 block">Copied customer ID</span>
              ) : null}
            </div>

            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase block">
                Subscription ID
              </span>
              {subscription.stripeSubscriptionId ? (
                <div className="flex items-center justify-between mt-1 gap-2 bg-muted/50 p-2 rounded-lg border border-border/40">
                  <span className="text-xs font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                    {subscription.stripeSubscriptionId}
                  </span>
                  <button
                    onClick={() => handleCopy(subscription.stripeSubscriptionId!, "sub")}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground mt-1 block">
                  No active Stripe subscription
                </span>
              )}
              {copiedField === "sub" ? (
                <span className="text-[10px] text-emerald-500 mt-1 block">
                  Copied subscription ID
                </span>
              ) : null}
            </div>

            {subscription.stripeSubscriptionId ? (
              <div className="pt-4 border-t border-border/40">
                <p className="text-xs text-muted-foreground">
                  Stripe-managed subscriptions are synchronized automatically via webhooks. To force
                  a sync, you can run a manual reconcile.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Immutable Event Timeline */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/40 bg-muted/20 py-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Subscription Event History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {subscription.events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No events recorded for this subscription yet.
            </p>
          ) : (
            <div className="relative border-l-2 border-border/60 pl-6 ml-3 space-y-8 py-2">
              {subscription.events.map((event) => (
                <div key={event.id} className="relative group">
                  {/* Timeline point indicator */}
                  <div className="absolute -left-[35px] top-0 bg-background border-2 border-border rounded-full p-1 group-hover:border-primary transition-colors">
                    {getEventIcon(event.eventType)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-sm font-semibold capitalize">
                        {event.eventType.replace("_", " ")}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        {new Date(event.occurredAt).toLocaleString()}
                      </span>
                    </div>

                    {getActorLabel(event.actorType, event.actorId)}

                    {/* Change details */}
                    <div className="text-sm text-foreground/90 mt-2 space-y-1">
                      {event.eventType === "plan_changed" &&
                      (event.fromPlanName || event.toPlanName) ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="line-through">{event.fromPlanName ?? "Initial"}</span>
                          <span>&rarr;</span>
                          <span className="text-primary font-medium">
                            {event.toPlanName ?? "Removed"}
                          </span>
                        </div>
                      ) : null}

                      {event.eventType === "status_changed" &&
                      (event.fromStatus || event.toStatus) ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="line-through capitalize">
                            {event.fromStatus ?? "None"}
                          </span>
                          <span>&rarr;</span>
                          <span className="text-primary font-medium capitalize">
                            {event.toStatus ?? "None"}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Event Metadata */}
                    {event.metadata && Object.keys(event.metadata).length > 0 ? (
                      <div className="mt-2 text-[11px] font-mono bg-muted/60 p-2 rounded border border-border/30 overflow-x-auto max-w-full text-muted-foreground">
                        <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual plan assignment Modal */}
      <AppModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        title="Assign Subscription Plan"
        description={`Directly assign a billing plan to ${subscription.tenantName}. This is logged immutably in the history.`}
        icon={<Settings className="h-5 w-5 text-primary" />}
        size="md"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAssignModalOpen(false)}
              disabled={assigning}
            >
              Cancel
            </Button>
            <Button type="submit" form="assign-plan-form" disabled={assigning || !selectedPlanId}>
              {assigning ? "Assigning..." : "Assign Plan"}
            </Button>
          </div>
        }
      >
        <form id="assign-plan-form" onSubmit={handleAssignPlanSubmit} className="space-y-4">
          {assignError ? <p className="text-sm text-destructive">{assignError}</p> : null}
          <div className="space-y-2">
            <Label htmlFor="assign-plan-select">Choose Plan</Label>
            <SearchableSelect
              id="assign-plan-select"
              options={planOptions}
              value={selectedPlanId}
              onValueChange={setSelectedPlanId}
              placeholder="Select plan..."
            />
          </div>
        </form>
      </AppModal>
    </div>
  );
}
