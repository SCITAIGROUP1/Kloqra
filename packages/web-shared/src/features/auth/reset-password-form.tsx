"use client";

import { ROUTES, PLATFORM_LOGIN_DESCRIPTION, PLATFORM_PORTAL_LABEL } from "@kloqra/contracts";
import { Button, PasswordInput, Label } from "@kloqra/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../api/client";
import { AuthShell } from "../../components/auth-shell";
import { PasswordStrengthIndicator } from "../../components/password-strength-indicator";
import { extractFieldErrorsFromMessage } from "../../utils/form-errors";
import { validateResetPasswordFields } from "./reset-password-validation";

export function ResetPasswordForm({
  token,
  loginHref = "/login",
  variant = "default"
}: {
  token: string;
  loginHref?: string;
  variant?: "default" | "platform";
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    const validationErrors = validateResetPasswordFields(password, confirm);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }
    setSubmitting(true);
    try {
      await api(ROUTES.AUTH.RESET_PASSWORD, {
        method: "POST",
        body: JSON.stringify({ token, newPassword: password })
      });
      router.push(`${loginHref}?reason=password-reset`);
    } catch (err) {
      if (err instanceof Error) {
        const parsed = extractFieldErrorsFromMessage(err.message, {
          password: "New Password",
          confirm: "Confirm Password"
        });
        setFieldErrors(parsed.fieldErrors);
        setError(parsed.formError);
      } else {
        setError("Could not reset password.");
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

  if (!token) {
    return (
      <AuthShell title="Reset password" {...shellProps}>
        <p className="text-sm text-destructive">Missing or invalid reset link.</p>
        <Link href={loginHref} className="mt-4 text-sm text-primary hover:underline">
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset password" {...shellProps}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            minLength={8}
            required
            aria-invalid={Boolean(fieldErrors.password)}
          />
          <PasswordStrengthIndicator password={password} />
          {fieldErrors.password ? (
            <p className="text-xs text-destructive">{fieldErrors.password}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (fieldErrors.confirm) {
                setFieldErrors((prev) => ({ ...prev, confirm: undefined }));
              }
            }}
            minLength={8}
            required
            aria-invalid={Boolean(fieldErrors.confirm)}
          />
          {fieldErrors.confirm ? (
            <p className="text-xs text-destructive">{fieldErrors.confirm}</p>
          ) : null}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Reset password"}
        </Button>
      </form>
    </AuthShell>
  );
}
