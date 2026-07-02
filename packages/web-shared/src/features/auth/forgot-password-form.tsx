"use client";

import { ROUTES, PLATFORM_LOGIN_DESCRIPTION, PLATFORM_PORTAL_LABEL } from "@kloqra/contracts";
import { Button, Input, Label } from "@kloqra/ui";
import Link from "next/link";
import { useState } from "react";
import { api } from "../../api/client";
import { AuthShell } from "../../components/auth-shell";
import { extractFieldErrorsFromMessage } from "../../utils/form-errors";

export function ForgotPasswordForm({
  loginHref = "/login",
  variant = "default"
}: {
  loginHref?: string;
  variant?: "default" | "platform";
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEmailError("");
    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Email must be a valid email address");
      return;
    }
    setSubmitting(true);
    try {
      await api(ROUTES.AUTH.FORGOT_PASSWORD, {
        method: "POST",
        body: JSON.stringify({ email: email.trim() })
      });
      setSent(true);
    } catch (err) {
      if (err instanceof Error) {
        const parsed = extractFieldErrorsFromMessage(err.message, { email: "Email" });
        setEmailError(parsed.fieldErrors.email ?? "");
        setError(parsed.formError);
      } else {
        setError("Could not send reset email.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const shellProps =
    variant === "platform"
      ? {
          portalLabel: PLATFORM_PORTAL_LABEL,
          description: PLATFORM_LOGIN_DESCRIPTION,
          variant: "platform" as const
        }
      : {};

  return (
    <AuthShell title="Forgot password" {...shellProps}>
      {sent ? (
        <div className="space-y-4 text-sm">
          <p>If an account exists for that email, we sent a password reset link.</p>
          <Link href={loginHref} className="text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {variant === "platform"
              ? "Enter your platform admin email and we will send a reset link."
              : "Enter your email and we will send a link to reset your password."}
          </p>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              required
              aria-invalid={Boolean(emailError)}
            />
            {emailError ? <p className="text-xs text-destructive">{emailError}</p> : null}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
          <Link href={loginHref} className="text-center text-sm text-primary hover:underline">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
