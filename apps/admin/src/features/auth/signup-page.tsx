"use client";

import { PLAN_SLUGS, ROUTES, slugifyName, type SignupPlanSlug } from "@kloqra/contracts";
import { Button, Input, Label, PasswordInput } from "@kloqra/ui";
import { AuthShell, getLegalUrls, usePublicPlans } from "@kloqra/web-shared";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { publicFetch } from "@/lib/api";

function isSignupPlanSlug(value: string | null): value is SignupPlanSlug {
  return value === PLAN_SLUGS.STARTER || value === PLAN_SLUGS.PRO;
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get("plan");
  const { plans, loading: plansLoading } = usePublicPlans();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [planSlug, setPlanSlug] = useState<SignupPlanSlug>(PLAN_SLUGS.STARTER);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isSignupPlanSlug(initialPlan)) {
      setPlanSlug(initialPlan);
    }
  }, [initialPlan]);

  const planOptions = useMemo(() => {
    if (plans.length > 0) return plans;
    return [
      { slug: PLAN_SLUGS.STARTER, name: "Starter" },
      { slug: PLAN_SLUGS.PRO, name: "Pro" }
    ];
  }, [plans]);

  const organizationIdPreview = useMemo(() => {
    const preview = slugifyName(organizationName.trim());
    return preview || "your-organization";
  }, [organizationName]);

  const legal = getLegalUrls();
  const legalRequired = Boolean(legal.tos && legal.privacy);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !password.trim() || !organizationName.trim()) {
      setError("All fields are required.");
      return;
    }
    if (legalRequired && !acceptedLegal) {
      setError("Accept the Terms of Service and Privacy Policy to continue.");
      return;
    }

    setSubmitting(true);
    try {
      await publicFetch(ROUTES.AUTH.SIGNUP, {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
          organizationName: organizationName.trim(),
          planSlug
        })
      });
      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your organization"
      description="Start a 30-day trial. No credit card required."
      portalLabel="Admin"
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label>Plan</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {planOptions.map((plan) => (
              <button
                key={plan.slug}
                type="button"
                data-testid={`signup-plan-${plan.slug}`}
                onClick={() => setPlanSlug(plan.slug as SignupPlanSlug)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  planSlug === plan.slug
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
                disabled={plansLoading}
              >
                <div className="font-medium">{plan.name}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-name">Your name</Label>
          <Input
            id="signup-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email">Work email</Label>
          <Input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <PasswordInput
            id="signup-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-org">Organization name</Label>
          <Input
            id="signup-org"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            autoComplete="organization"
          />
          <p className="text-xs text-muted-foreground" data-testid="signup-org-id-preview">
            Your organization ID will be:{" "}
            <span className="font-mono text-foreground">{organizationIdPreview}</span>
          </p>
        </div>
        {legalRequired ? (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={acceptedLegal}
              onChange={(e) => setAcceptedLegal(e.target.checked)}
              data-testid="signup-accept-legal"
            />
            <span>
              I agree to the{" "}
              <a
                href={legal.tos!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href={legal.privacy!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Privacy Policy
              </a>
              .
            </span>
          </label>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}

export function SignupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
