"use client";

import { ROUTES, type PlanCatalogItemDto, type UpdatePlatformPlanDto } from "@kloqra/contracts";
import {
  AppBar,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  SegmentedControl
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
import { planBillingModeDescription } from "@/features/plans/plan-catalog-labels";
import { buildSinglePlanPreview } from "@/features/plans/plan-catalog-preview";

type PlanEditPageProps = {
  planId: string;
};

function applyPlanToForm(
  plan: PlanCatalogItemDto,
  setters: {
    setName: (v: string) => void;
    setTagline: (v: string) => void;
    setMonthlyPrice: (v: string) => void;
    setYearlyPrice: (v: string) => void;
    setMaxWorkspaces: (v: string) => void;
    setMaxSeats: (v: string) => void;
    setMaxReportingApiKeys: (v: string) => void;
    setFeaturesText: (v: string) => void;
    setStripeProductId: (v: string) => void;
    setStripePriceId: (v: string) => void;
    setContactHref: (v: string) => void;
    setSortOrder: (v: string) => void;
    setIsPublic: (v: boolean) => void;
    setVisibleOnPricing: (v: boolean) => void;
    setRecommended: (v: boolean) => void;
    setBillingMode: (v: "stripe" | "contact") => void;
  }
) {
  setters.setName(plan.name);
  setters.setTagline(plan.tagline ?? "");
  setters.setMonthlyPrice(
    plan.monthlyPriceCents != null ? String(plan.monthlyPriceCents / 100) : ""
  );
  setters.setYearlyPrice(plan.yearlyPriceCents != null ? String(plan.yearlyPriceCents / 100) : "");
  setters.setMaxWorkspaces(String(plan.limits.maxWorkspaces));
  setters.setMaxSeats(String(plan.limits.maxSeats));
  setters.setMaxReportingApiKeys(String(plan.limits.maxReportingApiKeys));
  setters.setFeaturesText((plan.features ?? []).join("\n"));
  setters.setStripeProductId(plan.stripeProductId ?? "");
  setters.setStripePriceId(plan.stripePriceId ?? "");
  setters.setContactHref(plan.contactHref ?? "");
  setters.setSortOrder(String(plan.sortOrder));
  setters.setIsPublic(plan.isPublic);
  setters.setVisibleOnPricing(plan.visibleOnPricing);
  setters.setRecommended(plan.recommended);
  setters.setBillingMode(plan.billingMode);
}

function buildDraftPlan(
  base: PlanCatalogItemDto,
  form: {
    name: string;
    tagline: string;
    monthlyPrice: string;
    yearlyPrice: string;
    maxWorkspaces: string;
    maxSeats: string;
    maxReportingApiKeys: string;
    featuresText: string;
    stripeProductId: string;
    stripePriceId: string;
    contactHref: string;
    sortOrder: string;
    isPublic: boolean;
    visibleOnPricing: boolean;
    recommended: boolean;
    billingMode: "stripe" | "contact";
  }
): PlanCatalogItemDto {
  return {
    ...base,
    name: form.name.trim() || base.name,
    tagline: form.tagline.trim() || null,
    monthlyPriceCents: form.monthlyPrice.trim()
      ? Math.round(Number(form.monthlyPrice) * 100)
      : null,
    yearlyPriceCents: form.yearlyPrice.trim() ? Math.round(Number(form.yearlyPrice) * 100) : null,
    limits: {
      maxWorkspaces: Number(form.maxWorkspaces) || base.limits.maxWorkspaces,
      maxSeats: Number(form.maxSeats) || base.limits.maxSeats,
      maxReportingApiKeys: Number(form.maxReportingApiKeys) || base.limits.maxReportingApiKeys
    },
    features: form.featuresText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    stripeProductId: form.stripeProductId.trim() || null,
    stripePriceId: form.stripePriceId.trim() || null,
    contactHref: form.contactHref.trim() || null,
    sortOrder: Number(form.sortOrder) || base.sortOrder,
    isPublic: form.isPublic,
    visibleOnPricing: form.visibleOnPricing,
    recommended: form.recommended,
    billingMode: form.billingMode
  };
}

export function PlanEditPage({ planId }: PlanEditPageProps) {
  const {
    plans,
    pricingBaselineFeatures,
    loading: plansLoading,
    error: plansError
  } = usePlatformPlans();
  const [plan, setPlan] = useState<PlanCatalogItemDto | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [yearlyPrice, setYearlyPrice] = useState("");
  const [maxWorkspaces, setMaxWorkspaces] = useState("");
  const [maxSeats, setMaxSeats] = useState("");
  const [maxReportingApiKeys, setMaxReportingApiKeys] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [stripeProductId, setStripeProductId] = useState("");
  const [stripePriceId, setStripePriceId] = useState("");
  const [contactHref, setContactHref] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isPublic, setIsPublic] = useState(false);
  const [visibleOnPricing, setVisibleOnPricing] = useState(false);
  const [recommended, setRecommended] = useState(false);
  const [billingMode, setBillingMode] = useState<"stripe" | "contact">("stripe");

  useEffect(() => {
    if (plansLoading) return;
    const fromList = plans.find((item) => item.id === planId);
    if (fromList) {
      setPlan(fromList);
      applyPlanToForm(fromList, {
        setName,
        setTagline,
        setMonthlyPrice,
        setYearlyPrice,
        setMaxWorkspaces,
        setMaxSeats,
        setMaxReportingApiKeys,
        setFeaturesText,
        setStripeProductId,
        setStripePriceId,
        setContactHref,
        setSortOrder,
        setIsPublic,
        setVisibleOnPricing,
        setRecommended,
        setBillingMode
      });
      return;
    }

    void api<PlanCatalogItemDto>(ROUTES.PLATFORM.PLAN(planId))
      .then((data) => {
        setPlan(data);
        applyPlanToForm(data, {
          setName,
          setTagline,
          setMonthlyPrice,
          setYearlyPrice,
          setMaxWorkspaces,
          setMaxSeats,
          setMaxReportingApiKeys,
          setFeaturesText,
          setStripeProductId,
          setStripePriceId,
          setContactHref,
          setSortOrder,
          setIsPublic,
          setVisibleOnPricing,
          setRecommended,
          setBillingMode
        });
      })
      .catch(() => setError(plansError ?? "Failed to load plan"));
  }, [planId, plans, plansLoading, plansError]);

  const draftPlan = useMemo(
    () =>
      plan
        ? buildDraftPlan(plan, {
            name,
            tagline,
            monthlyPrice,
            yearlyPrice,
            maxWorkspaces,
            maxSeats,
            maxReportingApiKeys,
            featuresText,
            stripeProductId,
            stripePriceId,
            contactHref,
            sortOrder,
            isPublic,
            visibleOnPricing,
            recommended,
            billingMode
          })
        : null,
    [
      plan,
      name,
      tagline,
      monthlyPrice,
      yearlyPrice,
      maxWorkspaces,
      maxSeats,
      maxReportingApiKeys,
      featuresText,
      stripeProductId,
      stripePriceId,
      contactHref,
      sortOrder,
      isPublic,
      visibleOnPricing,
      recommended,
      billingMode
    ]
  );

  const previewTier = useMemo(
    () => (draftPlan ? buildSinglePlanPreview(draftPlan, pricingBaselineFeatures) : null),
    [draftPlan, pricingBaselineFeatures]
  );

  async function save() {
    if (!plan) return;
    setSaving(true);
    setError("");
    setMessage("");

    const body: UpdatePlatformPlanDto = {
      name: name.trim(),
      tagline: tagline.trim() || null,
      limits: {
        maxWorkspaces: Number(maxWorkspaces),
        maxSeats: Number(maxSeats),
        maxReportingApiKeys: Number(maxReportingApiKeys)
      },
      monthlyPriceCents: monthlyPrice.trim() ? Math.round(Number(monthlyPrice) * 100) : null,
      yearlyPriceCents: yearlyPrice.trim() ? Math.round(Number(yearlyPrice) * 100) : null,
      features: featuresText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      stripeProductId: stripeProductId.trim() || null,
      stripePriceId: stripePriceId.trim() || null,
      contactHref: contactHref.trim() || null,
      sortOrder: Number(sortOrder),
      isPublic,
      visibleOnPricing,
      recommended,
      billingMode
    };

    try {
      const updated = await api<PlanCatalogItemDto>(ROUTES.PLATFORM.PLAN(planId), {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      setPlan(updated);
      setMessage("Plan saved.");
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !plan && !plansLoading) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!plan) {
    return <p className="text-sm text-muted-foreground">Loading plan…</p>;
  }

  return (
    <div className="space-y-6">
      <AppBar
        title={plan.name}
        description={`Slug: ${plan.slug} · ${planBillingModeDescription(billingMode)}`}
        actions={
          <Link href="/plans" className="text-sm text-primary hover:underline">
            Back to plans
          </Link>
        }
      />

      <div className="mx-auto max-w-6xl space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Marketing</CardTitle>
                <CardDescription>Name, prices, and extras unique to this tier.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="plan-name">Display name</Label>
                  <Input id="plan-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-tagline">Tagline</Label>
                  <Input
                    id="plan-tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="monthly-price">Monthly price (USD)</Label>
                    <Input
                      id="monthly-price"
                      type="number"
                      min="0"
                      step="1"
                      value={monthlyPrice}
                      onChange={(e) => setMonthlyPrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearly-price">Yearly price (USD)</Label>
                    <Input
                      id="yearly-price"
                      type="number"
                      min="0"
                      step="1"
                      value={yearlyPrice}
                      onChange={(e) => setYearlyPrice(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-features">Tier-specific features (one per line)</Label>
                  <p className="text-xs text-muted-foreground">
                    Shown after seat and workspace limits. Shared basics come from common features
                    on the Plans list.
                  </p>
                  <textarea
                    id="plan-features"
                    className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={featuresText}
                    onChange={(e) => setFeaturesText(e.target.value)}
                    placeholder={
                      billingMode === "contact"
                        ? "Dedicated account manager"
                        : plan.slug === "pro"
                          ? "Priority email support"
                          : "Leave empty to use common features only"
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Limits & billing</CardTitle>
                <CardDescription>
                  Caps enforced for tenants and how upgrades are handled.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="max-workspaces">Workspaces</Label>
                    <Input
                      id="max-workspaces"
                      type="number"
                      min="1"
                      value={maxWorkspaces}
                      onChange={(e) => setMaxWorkspaces(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-seats">Seats</Label>
                    <Input
                      id="max-seats"
                      type="number"
                      min="1"
                      value={maxSeats}
                      onChange={(e) => setMaxSeats(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-api-keys">API keys</Label>
                    <Input
                      id="max-api-keys"
                      type="number"
                      min="0"
                      value={maxReportingApiKeys}
                      onChange={(e) => setMaxReportingApiKeys(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing-mode">Billing mode</Label>
                  <select
                    id="billing-mode"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={billingMode}
                    onChange={(e) => setBillingMode(e.target.value as "stripe" | "contact")}
                  >
                    <option value="stripe">Self-serve upgrade</option>
                    <option value="contact">Contact sales</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {planBillingModeDescription(billingMode)}
                  </p>
                </div>
                {billingMode === "stripe" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="stripe-product">Stripe product ID (optional)</Label>
                      <Input
                        id="stripe-product"
                        value={stripeProductId}
                        onChange={(e) => setStripeProductId(e.target.value)}
                        placeholder="prod_…"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stripe-price">Stripe price ID (optional)</Label>
                      <Input
                        id="stripe-price"
                        value={stripePriceId}
                        onChange={(e) => setStripePriceId(e.target.value)}
                        placeholder="price_…"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="contact-href">Contact href</Label>
                    <Input
                      id="contact-href"
                      value={contactHref}
                      onChange={(e) => setContactHref(e.target.value)}
                      placeholder="mailto:sales@kloqra.com"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="sort-order">Sort order</Label>
                  <Input
                    id="sort-order"
                    type="number"
                    min="0"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                    />
                    Public signup catalog
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={visibleOnPricing}
                      onChange={(e) => setVisibleOnPricing(e.target.checked)}
                    />
                    Show on pricing page
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={recommended}
                      onChange={(e) => setRecommended(e.target.checked)}
                    />
                    Recommended tier
                  </label>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="button" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : "Save plan"}
              </Button>
            </div>
          </div>

          <aside
            className="space-y-4 xl:sticky xl:top-6 xl:self-start"
            data-testid="plan-edit-preview"
          >
            <div className="space-y-3">
              <div className="space-y-1">
                <h2 className="text-base font-semibold">Live preview</h2>
                <p className="text-sm text-muted-foreground">
                  {visibleOnPricing
                    ? "Updates as you edit this tier."
                    : "Hidden from pricing until you enable “Show on pricing page”."}
                </p>
              </div>
              <div className="w-full rounded-xl border border-border bg-card p-1">
                <SegmentedControl
                  value={billingInterval}
                  onChange={setBillingInterval}
                  options={BILLING_INTERVAL_OPTIONS}
                  size="sm"
                  fullWidth
                />
              </div>
            </div>
            {previewTier ? (
              <PlanPricingCard tier={previewTier} billingInterval={billingInterval} preview />
            ) : (
              <Card className="border-dashed shadow-none">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Preview unavailable for this configuration.
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
