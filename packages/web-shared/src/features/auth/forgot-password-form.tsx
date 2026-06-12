"use client";

import { ROUTES } from "@kloqra/contracts";
import { Button, Input, Label } from "@kloqra/ui";
import Link from "next/link";
import { useState } from "react";
import { api } from "../../api/client";
import { AuthShell } from "../../components/auth-shell";

export function ForgotPasswordForm({ loginHref = "/login" }: { loginHref?: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api(ROUTES.AUTH.FORGOT_PASSWORD, {
        method: "POST",
        body: JSON.stringify({ email: email.trim() })
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Forgot password">
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
            Enter your email and we will send a link to reset your password.
          </p>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
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
