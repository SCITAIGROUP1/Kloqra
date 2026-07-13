"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  AuthSessionDto,
  LoginRequires2faResponseDto,
  LoginRequiresPasswordChangeResponseDto,
  LoginRequiresEmailVerificationResponseDto
} from "@kloqra/contracts";
import { Button, Input, Label, PasswordInput } from "@kloqra/ui";
import {
  applyDefaultWorkspaceIfNeeded,
  AuthShell,
  establishTenantSession,
  extractFieldErrorsFromMessage,
  orgLoginDescription,
  resolveAdminPostAuthPath,
  useInviteHandoffLogin,
  useOrgLoginBranding,
  useRedirectIfAuthenticated
} from "@kloqra/web-shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { api } from "@/lib/api";

type LoginResponse =
  | (AuthSessionDto & { accessToken: string; refreshToken?: string })
  | LoginRequires2faResponseDto
  | LoginRequiresPasswordChangeResponseDto
  | LoginRequiresEmailVerificationResponseDto;

export function AdminLoginForm() {
  const router = useRouter();
  const orgBranding = useOrgLoginBranding();
  const { checking: sessionChecking } = useRedirectIfAuthenticated({
    resolvePath: resolveAdminPostAuthPath,
    bootstrapOptions: { allowProjectLead: true, allowTenantOperator: true }
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    totpCode?: string;
  }>({});

  const handleInvitePrefill = useCallback((nextEmail: string, nextPassword: string) => {
    setEmail(nextEmail);
    setPassword(nextPassword);
  }, []);

  const handleInviteError = useCallback((message: string) => {
    setError(message);
  }, []);

  const { loading: inviteLoading } = useInviteHandoffLogin({
    onPrefill: handleInvitePrefill,
    onError: handleInviteError
  });

  async function completeLogin(
    res: AuthSessionDto & { accessToken: string; refreshToken?: string }
  ) {
    const switched = await applyDefaultWorkspaceIfNeeded(res, res.accessToken);
    establishTenantSession(switched.session, switched.accessToken, res.refreshToken);
    router.push(await resolveAdminPostAuthPath(switched.session));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    if (!pendingToken) {
      const nextFieldErrors: { email?: string; password?: string } = {};
      if (!email.trim()) nextFieldErrors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        nextFieldErrors.email = "Email must be a valid email address";
      }
      if (!password.trim()) nextFieldErrors.password = "Password is required";
      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
        return;
      }
    } else {
      if (!/^\d{6}$/.test(totpCode.trim())) {
        setFieldErrors({ totpCode: "Authentication code must be 6 digits" });
        return;
      }
    }
    try {
      const res = await api<LoginResponse>(ROUTES.AUTH.LOGIN, {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          ...(pendingToken ? { pendingToken } : {}),
          ...(totpCode ? { totpCode } : {})
        })
      });
      if ("requiresPasswordChange" in res && res.requiresPasswordChange) {
        router.push(`/set-password?token=${encodeURIComponent(res.pendingToken)}`);
        return;
      }
      if ("requiresEmailVerification" in res && res.requiresEmailVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(res.email)}`);
        return;
      }
      if ("requires2fa" in res && res.requires2fa) {
        setPendingToken(res.pendingToken);
        return;
      }
      await completeLogin(res as AuthSessionDto & { accessToken: string });
    } catch (err) {
      if (err instanceof Error) {
        const parsed = extractFieldErrorsFromMessage(err.message, {
          email: "Email",
          password: "Password",
          totpCode: ["Authentication code", "Totp Code"]
        });
        setFieldErrors(parsed.fieldErrors);
        setError(parsed.formError);
        return;
      }
      setError("Something went wrong. Your time is safe — try again.");
    }
  }

  return (
    <AuthShell
      title="Admin sign in"
      portalLabel="Admin Portal"
      description={orgLoginDescription(
        orgBranding,
        "Enter your email and password to access your account."
      )}
    >
      {sessionChecking || inviteLoading ? (
        <p className="text-sm text-muted-foreground">
          {sessionChecking ? "Checking your session…" : "Preparing your sign-in…"}
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          {!pendingToken ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.email)}
                />
                {fieldErrors.email ? (
                  <p className="text-xs text-destructive">{fieldErrors.email}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                {fieldErrors.password ? (
                  <p className="text-xs text-destructive">{fieldErrors.password}</p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="totp">Authentication code</Label>
              <Input
                id="totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={totpCode}
                onChange={(e) => {
                  setTotpCode(e.target.value);
                  if (fieldErrors.totpCode) {
                    setFieldErrors((prev) => ({ ...prev, totpCode: undefined }));
                  }
                }}
                maxLength={6}
                aria-invalid={Boolean(fieldErrors.totpCode)}
              />
              {fieldErrors.totpCode ? (
                <p className="text-xs text-destructive">{fieldErrors.totpCode}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code from your authenticator app.
              </p>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit">{pendingToken ? "Verify" : "Sign in"}</Button>
          {!pendingToken ? (
            <p className="text-center text-sm">
              <Link href="/forgot-password" className="text-primary hover:underline">
                Forgot password?
              </Link>
              {process.env.NEXT_PUBLIC_SELF_SERVE_SIGNUP === "true" ? (
                <>
                  {" · "}
                  <Link href="/signup" className="text-primary hover:underline">
                    Create an account
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
        </form>
      )}
    </AuthShell>
  );
}
