"use client";

import {
  PLATFORM_LOGIN_DESCRIPTION,
  PLATFORM_LOGIN_TITLE,
  PLATFORM_PORTAL_LABEL,
  ROUTES
} from "@kloqra/contracts";
import type {
  LoginRequires2faResponseDto,
  LoginRequiresPlatform2faSetupResponseDto,
  PlatformSessionWithTokenDto
} from "@kloqra/contracts";
import { Button, Input, Label, PasswordInput } from "@kloqra/ui";
import {
  AuthShell,
  extractFieldErrorsFromMessage,
  usePlatformSessionStore
} from "@kloqra/web-shared";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { api } from "@/lib/api";

type PlatformLoginResponse =
  | PlatformSessionWithTokenDto
  | LoginRequires2faResponseDto
  | LoginRequiresPlatform2faSetupResponseDto;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const securityNotice =
    searchParams.get("reason") === "2fa-required"
      ? "Two-factor authentication is required for platform console access. Sign in to continue setup."
      : null;
  const setSession = usePlatformSessionStore((s) => s.setSession);
  const [email, setEmail] = useState("platform@kloqra.dev");
  const [password, setPassword] = useState("password123");
  const [totpCode, setTotpCode] = useState("");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    totpCode?: string;
  }>({});

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
    } else if (!/^\d{6}$/.test(totpCode.trim())) {
      setFieldErrors({ totpCode: "Authentication code must be 6 digits" });
      return;
    }

    try {
      const res = await api<PlatformLoginResponse>(ROUTES.AUTH.LOGIN, {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          ...(pendingToken ? { pendingToken } : {}),
          ...(totpCode ? { totpCode } : {})
        })
      });
      if ("requires2faSetup" in res && res.requires2faSetup) {
        router.push(`/setup-2fa?token=${encodeURIComponent(res.pendingToken)}`);
        return;
      }
      if ("requires2fa" in res && res.requires2fa) {
        setPendingToken(res.pendingToken);
        return;
      }
      const session = res as PlatformSessionWithTokenDto;
      setSession(session, session.accessToken, session.refreshToken);
      router.push("/tenants");
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
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <AuthShell
      title={PLATFORM_LOGIN_TITLE}
      portalLabel={PLATFORM_PORTAL_LABEL}
      description={PLATFORM_LOGIN_DESCRIPTION}
      variant="platform"
    >
      {securityNotice ? (
        <p className="mb-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {securityNotice}
        </p>
      ) : null}
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
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit">{pendingToken ? "Verify" : "Sign in"}</Button>
        {!pendingToken ? (
          <p className="text-center text-sm">
            <Link href="/forgot-password" className="text-primary hover:underline">
              Forgot password?
            </Link>
          </p>
        ) : null}
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
