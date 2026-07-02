"use client";

import { type PaidPlanSlug } from "@kloqra/contracts";
import { AppBar, CenteredLoader, StaggerItem } from "@kloqra/ui";
import {
  BILLING_INTERVAL_OPTIONS,
  buildPricingTiersFromCatalog,
  isPaidCheckoutTier,
  isTierCurrent,
  useCreateCheckoutSession,
  useChangeSubscriptionPlan,
  useCreatePortalSession,
  usePricingPlans,
  useSalesInquiry,
  useSubmitSalesInquiry,
  useTenantSubscription,
  useUploadSalesReceipt,
  getLegalUrls,
  type BillingInterval,
  type PlanPricingTier
} from "@kloqra/web-shared";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SegmentedControl } from "@/components/admin-page";
import { PLAN_PRICING_TIERS } from "@/config/plan-pricing-catalog";
import {
  CONTACT_SALES_PLAN_SLUG,
  ContactSalesDialog
} from "@/features/account/contact-sales-dialog";
import { PlanPricingCard } from "@/features/account/plan-pricing-card";
import { SalesInquiryStatusCard } from "@/features/account/sales-inquiry-status-card";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function tierTestId(tier: PlanPricingTier): string | undefined {
  if (isPaidCheckoutTier(tier)) {
    return `billing-upgrade-${tier.slug}`;
  }
  if (tier.kind === "contact") {
    return "billing-contact-sales";
  }
  return undefined;
}

export function AccountBillingPage() {
  const { subscription, loading, error, reload } = useTenantSubscription();
  const { catalog, loading: pricingLoading } = usePricingPlans();
  const { inquiry, reload: reloadInquiry } = useSalesInquiry();
  const { submit: submitInquiry, loading: submitInquiryLoading } = useSubmitSalesInquiry();
  const { upload: uploadReceipt, loading: uploadReceiptLoading } = useUploadSalesReceipt();
  const pricingTiers = useMemo(
    () => (catalog ? buildPricingTiersFromCatalog(catalog) : PLAN_PRICING_TIERS),
    [catalog]
  );
  const { createCheckout, loading: checkoutLoading } = useCreateCheckoutSession();
  const { changePlan, loading: changePlanLoading } = useChangeSubscriptionPlan();
  const { createPortal, loading: portalLoading } = useCreatePortalSession();
  const [upgradingSlug, setUpgradingSlug] = useState<PaidPlanSlug | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const isSimulatedBilling = subscription?.billingMode === "simulated";
  const upgradeLoading = isSimulatedBilling ? changePlanLoading : checkoutLoading;
  const hasActiveInquiry = inquiry != null;

  if (loading || pricingLoading) return <CenteredLoader label="Loading billing…" />;
  if (error || !subscription) {
    return (
      <div className="p-6 text-sm text-destructive" data-testid="billing-error">
        {error ?? "Subscription unavailable"}
      </div>
    );
  }

  async function handleUpgrade(planSlug: PaidPlanSlug) {
    setUpgradingSlug(planSlug);
    if (isSimulatedBilling) {
      const updated = await changePlan({ planSlug });
      setUpgradingSlug(null);
      if (updated) {
        await reload();
        toast.success(`Plan updated to ${updated.planName}`);
        return;
      }
      toast.error("Could not change plan. Try again or contact support.");
      return;
    }

    const url = await createCheckout({ planSlug });
    setUpgradingSlug(null);
    if (url) {
      window.location.assign(url);
      return;
    }
    toast.error("Could not start checkout. Try again or contact support.");
  }

  async function handleContactSalesSubmit(input: { message?: string }) {
    const result = await submitInquiry({
      planSlug: CONTACT_SALES_PLAN_SLUG,
      message: input.message,
      billingInterval
    });
    if (result) {
      setContactDialogOpen(false);
      await reloadInquiry();
      toast.success("Sales request submitted — we will email you shortly.");
      return;
    }
    toast.error("Could not submit request. Try again or contact support.");
  }

  async function handleReceiptUpload(file: File) {
    const result = await uploadReceipt(file);
    if (result) {
      await reloadInquiry();
      toast.success("Receipt uploaded — our team will review it.");
      return;
    }
    toast.error("Could not upload receipt. Check file type and size.");
  }

  async function handleManage() {
    const url = await createPortal();
    if (url) {
      window.location.assign(url);
      return;
    }
    toast.error("Billing portal is unavailable until a subscription is linked.");
  }

  const showPastDue =
    subscription.billingAlert === "past_due" || subscription.status === "past_due";
  const showTrialEnding = subscription.billingAlert === "trial_ending";
  const refundUrl = getLegalUrls().refund;
  const contactTier = pricingTiers.find((tier) => tier.kind === "contact");

  return (
    <div className="space-y-6">
      <AppBar
        title="Billing and Plan"
        description="Find the right plan for you. Simple, transparent pricing with no hidden fees."
      />

      {showPastDue ? (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          data-testid="billing-past-due-banner"
        >
          Payment is past due. Time logging is paused until you update billing.
        </div>
      ) : null}

      {showTrialEnding ? (
        <div
          className="rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-status-warning-fg"
          data-testid="billing-trial-ending-banner"
        >
          Your trial ends on {formatDate(subscription.trialEndsAt)}. Choose a plan to keep access.
        </div>
      ) : null}

      {inquiry ? (
        <SalesInquiryStatusCard
          inquiry={inquiry}
          uploading={uploadReceiptLoading}
          onUpload={(file) => void handleReceiptUpload(file)}
        />
      ) : null}

      <section
        className="flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 px-6 py-6 text-center"
        aria-label="Billing interval"
      >
        <p className="text-sm text-muted-foreground">
          Choose a plan that fits your team and upgrade anytime as you grow.
        </p>
        <div className="w-full max-w-[240px]" data-testid="billing-interval-toggle">
          <SegmentedControl
            value={billingInterval}
            onChange={setBillingInterval}
            options={BILLING_INTERVAL_OPTIONS}
            size="md"
            fullWidth
          />
        </div>
        {billingInterval === "yearly" ? (
          <p className="max-w-md text-xs text-muted-foreground">
            Yearly pricing includes 2 months free. Checkout uses monthly billing until annual plans
            are enabled.
          </p>
        ) : null}
        {isSimulatedBilling ? (
          <p
            className="max-w-md text-xs text-muted-foreground"
            data-testid="billing-simulated-note"
          >
            Payments are simulated in this environment. Plan changes apply immediately.
          </p>
        ) : null}
      </section>

      <div className="grid items-stretch gap-6 lg:grid-cols-3" data-testid="billing-upgrade-plans">
        {pricingTiers.map((tier, index) => {
          const isCurrent = isTierCurrent(tier, subscription);
          const checkoutSlug = isPaidCheckoutTier(tier) ? tier.slug : null;
          const isContact = tier.kind === "contact";

          return (
            <StaggerItem key={tier.name} index={index} className="h-full">
              <PlanPricingCard
                tier={tier}
                billingInterval={billingInterval}
                isCurrent={isCurrent}
                checkoutLoading={isContact ? submitInquiryLoading : upgradeLoading}
                upgrading={checkoutSlug !== null && upgradingSlug === checkoutSlug}
                testId={tierTestId(tier)}
                onUpgrade={
                  checkoutSlug
                    ? () => {
                        void handleUpgrade(checkoutSlug);
                      }
                    : undefined
                }
                onContact={
                  isContact && !isCurrent && !hasActiveInquiry
                    ? () => setContactDialogOpen(true)
                    : undefined
                }
              />
            </StaggerItem>
          );
        })}
      </div>

      {contactTier ? (
        <ContactSalesDialog
          open={contactDialogOpen}
          onOpenChange={setContactDialogOpen}
          planName={contactTier.name}
          billingInterval={billingInterval}
          loading={submitInquiryLoading}
          onSubmit={(input) => void handleContactSalesSubmit(input)}
        />
      ) : null}

      <p className="text-xs text-muted-foreground">
        Invoices and payment methods are managed in the{" "}
        <button
          type="button"
          className="underline"
          disabled={!subscription.stripeCustomerId || portalLoading}
          onClick={() => void handleManage()}
          data-testid="billing-manage-button"
        >
          {portalLoading ? "Opening portal…" : "Stripe customer portal"}
        </button>
        .
        {refundUrl ? (
          <>
            {" "}
            See our{" "}
            <a href={refundUrl} target="_blank" rel="noopener noreferrer" className="underline">
              refund and cancellation policy
            </a>
            .
          </>
        ) : null}{" "}
        Need help? <Link href="/account">Return to account</Link>.
      </p>
    </div>
  );
}
