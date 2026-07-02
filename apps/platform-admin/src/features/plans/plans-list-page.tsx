"use client";

import {
  DEFAULT_PRICING_BASELINE_FEATURES,
  formatPlanPriceUsd,
  ROUTES,
  type PlanCatalogItemDto,
  type PlatformCatalogSettingsDto,
  type UpdatePlatformCatalogSettingsDto
} from "@kloqra/contracts";
import {
  AppBar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Label,
  SegmentedControl,
  Table,
  TableBody,
  TableHeader,
  TableRow
} from "@kloqra/ui";
import {
  api,
  BILLING_INTERVAL_OPTIONS,
  PlanPricingCard,
  usePlatformPlans,
  type BillingInterval
} from "@kloqra/web-shared";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { planBillingModeLabel, sortPlansForDisplay } from "@/features/plans/plan-catalog-labels";
import {
  buildPlanPricingPreview,
  parseBaselineFeatures
} from "@/features/plans/plan-catalog-preview";

export function PlansListPage() {
  const { plans, pricingBaselineFeatures, loading, error, reload, setPricingBaselineFeatures } =
    usePlatformPlans();
  const [baselineText, setBaselineText] = useState("");
  const [baselineSaving, setBaselineSaving] = useState(false);
  const [baselineMessage, setBaselineMessage] = useState("");
  const [baselineError, setBaselineError] = useState("");
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");

  useEffect(() => {
    if (pricingBaselineFeatures.length > 0) {
      setBaselineText(pricingBaselineFeatures.join("\n"));
    }
  }, [pricingBaselineFeatures]);

  const sortedPlans = useMemo(() => sortPlansForDisplay(plans), [plans]);
  const previewBaseline = useMemo(
    () => parseBaselineFeatures(baselineText, pricingBaselineFeatures),
    [baselineText, pricingBaselineFeatures]
  );
  const previewTiers = useMemo(
    () => buildPlanPricingPreview(sortedPlans, previewBaseline),
    [sortedPlans, previewBaseline]
  );
  const hiddenPlanCount = sortedPlans.filter((plan) => !plan.visibleOnPricing).length;

  async function saveBaseline() {
    setBaselineSaving(true);
    setBaselineError("");
    setBaselineMessage("");
    const features = parseBaselineFeatures(baselineText, DEFAULT_PRICING_BASELINE_FEATURES);
    if (features.length === 0) {
      setBaselineError("Add at least one common feature.");
      setBaselineSaving(false);
      return;
    }

    const body: UpdatePlatformCatalogSettingsDto = { pricingBaselineFeatures: features };

    try {
      const saved = await api<PlatformCatalogSettingsDto>(ROUTES.PLATFORM.CATALOG_SETTINGS, {
        method: "PATCH",
        body: JSON.stringify(body)
      }).catch(async () => {
        await reload();
        return { pricingBaselineFeatures: features };
      });
      setPricingBaselineFeatures(saved.pricingBaselineFeatures);
      setBaselineText(saved.pricingBaselineFeatures.join("\n"));
      setBaselineMessage("Common features saved.");
    } catch {
      setBaselineError("Could not save common features. Restart the API if this persists.");
    } finally {
      setBaselineSaving(false);
    }
  }

  function resetBaselineToDefault() {
    const defaults = [...DEFAULT_PRICING_BASELINE_FEATURES];
    setBaselineText(defaults.join("\n"));
    setBaselineError("");
    setBaselineMessage("");
  }

  return (
    <div className="space-y-6">
      <AppBar
        title="Plans"
        description="Preview tenant pricing, edit shared features, and manage catalog tiers."
      />

      <div className="mx-auto max-w-6xl space-y-8">
        <section
          className="space-y-5 rounded-2xl border border-border/70 bg-muted/20 p-6"
          data-testid="plans-tenant-preview"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">Tenant preview</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                How visible plans appear on billing, signup, and the public pricing page. Updates as
                you edit plans or common features below.
              </p>
            </div>
            <div className="w-full max-w-xs rounded-xl border border-border bg-card p-1">
              <SegmentedControl
                value={billingInterval}
                onChange={setBillingInterval}
                options={BILLING_INTERVAL_OPTIONS}
                size="md"
                fullWidth
              />
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading preview…</p>
          ) : previewTiers.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-3">
              {previewTiers.map((tier) => (
                <PlanPricingCard
                  key={tier.name}
                  tier={tier}
                  billingInterval={billingInterval}
                  preview
                  testId={`plans-preview-${tier.kind === "checkout" ? tier.slug : "contact"}`}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed bg-card/60 shadow-none">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No plans are marked visible on the pricing page. Enable &quot;Show on pricing
                page&quot; on a tier to preview it here.
              </CardContent>
            </Card>
          )}

          {hiddenPlanCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              {hiddenPlanCount} hidden {hiddenPlanCount === 1 ? "tier" : "tiers"} not shown in this
              preview.
            </p>
          ) : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Common features</CardTitle>
              <CardDescription>
                Shared bullets on every pricing card after limits and tier extras.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="baseline-features">Basics (one per line)</Label>
                <textarea
                  id="baseline-features"
                  className="min-h-[11rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed"
                  value={baselineText}
                  disabled={loading}
                  onChange={(e) => setBaselineText(e.target.value)}
                  placeholder={DEFAULT_PRICING_BASELINE_FEATURES.join("\n")}
                  data-testid="plans-baseline-features"
                />
              </div>
              {baselineError ? (
                <p className="text-sm text-destructive" data-testid="plans-baseline-error">
                  {baselineError}
                </p>
              ) : null}
              {baselineMessage ? (
                <p className="text-sm text-muted-foreground">{baselineMessage}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={resetBaselineToDefault}
                >
                  Reset defaults
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={loading || baselineSaving}
                  onClick={() => void saveBaseline()}
                  data-testid="plans-baseline-save"
                >
                  {baselineSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Plan catalog</h2>
                <p className="text-sm text-muted-foreground">
                  Limits, pricing, visibility, and billing behavior.
                </p>
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {loading ? <p className="text-sm text-muted-foreground">Loading plans…</p> : null}

            <DataTableCard>
              <Table>
                <TableHeader>
                  <DataTableHeaderRow>
                    <DataTableHead>Plan</DataTableHead>
                    <DataTableHead>Billing</DataTableHead>
                    <DataTableHead>Monthly</DataTableHead>
                    <DataTableHead>Visibility</DataTableHead>
                    <DataTableHead>Extras</DataTableHead>
                    <DataTableHead />
                  </DataTableHeaderRow>
                </TableHeader>
                <TableBody>
                  {sortedPlans.map((plan) => (
                    <PlanRow key={plan.id} plan={plan} />
                  ))}
                </TableBody>
              </Table>
            </DataTableCard>
          </div>
        </section>
      </div>
    </div>
  );
}

function PlanRow({ plan }: { plan: PlanCatalogItemDto }) {
  const extras = plan.features?.length ?? 0;

  return (
    <TableRow>
      <DataTableCell>
        <div className="font-medium">{plan.name}</div>
        <div className="text-xs text-muted-foreground">{plan.slug}</div>
      </DataTableCell>
      <DataTableCell>
        <Badge variant={plan.billingMode === "contact" ? "secondary" : "outline"}>
          {planBillingModeLabel(plan.billingMode)}
        </Badge>
      </DataTableCell>
      <DataTableCell>{formatPlanPriceUsd(plan.monthlyPriceCents) ?? "Custom"}</DataTableCell>
      <DataTableCell className="text-xs text-muted-foreground">
        {plan.visibleOnPricing ? "Pricing page" : "Hidden"}
        {plan.isPublic ? " · Signup" : ""}
        {plan.recommended ? " · Recommended" : ""}
      </DataTableCell>
      <DataTableCell className="text-xs text-muted-foreground">
        {extras} tier {extras === 1 ? "extra" : "extras"}
      </DataTableCell>
      <DataTableCell>
        <Link
          href={`/plans/${plan.id}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Edit
        </Link>
      </DataTableCell>
    </TableRow>
  );
}
