"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  AuthSessionDto,
  LoginRequires2faResponseDto,
  LoginRequiresPasswordChangeResponseDto,
  LoginRequiresEmailVerificationResponseDto
} from "@kloqra/contracts";
import { Button, Input, Label } from "@kloqra/ui";
import { applyDefaultWorkspaceIfNeeded, AuthShell } from "@kloqra/web-shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

type LoginResponse =
  | (AuthSessionDto & { accessToken: string })
  | LoginRequires2faResponseDto
  | LoginRequiresPasswordChangeResponseDto
  | LoginRequiresEmailVerificationResponseDto;

export default function LoginPage() {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);
  const [email, setEmail] = useState("admin@kloqra.dev");
  const [password, setPassword] = useState("password123");
  const [totpCode, setTotpCode] = useState("");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function completeLogin(res: AuthSessionDto & { accessToken: string }) {
    if (res.workspaceRole !== "ADMIN") {
      setError("Admin access required");
      return;
    }
    const switched = await applyDefaultWorkspaceIfNeeded(res, res.accessToken);
    if (switched.session.workspaceRole !== "ADMIN") {
      setError("Admin access required");
      return;
    }
    setSession(switched.session, switched.accessToken);
    router.push("/dashboard");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
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
      setError(
        err instanceof Error ? err.message : "Something went wrong. Your time is safe — try again."
      );
    }
  }

  return (
    <AuthShell title="Admin sign in">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {!pendingToken ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
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
              onChange={(e) => setTotpCode(e.target.value)}
              maxLength={6}
            />
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
          </p>
        ) : null}
      </form>
    </AuthShell>
  );
}
