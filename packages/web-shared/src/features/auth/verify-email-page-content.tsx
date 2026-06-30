"use client";

import { ROUTES } from "@kloqra/contracts";
import type { AuthSessionDto, LoginRequires2faResponseDto } from "@kloqra/contracts";
import { Button, Input, Label } from "@kloqra/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { applyDefaultWorkspaceIfNeeded } from "../../auth/apply-default-workspace";
import { AuthShell } from "../../components/auth-shell";

type VerifyResponse =
  | (AuthSessionDto & { accessToken: string; refreshToken?: string })
  | LoginRequires2faResponseDto;

export function VerifyEmailPageContent({
  token,
  email: initialEmail = "",
  loginHref = "/login",
  onSession
}: {
  token?: string;
  email?: string;
  loginHref?: string;
  onSession: (
    session: AuthSessionDto,
    accessToken: string,
    refreshToken?: string
  ) => void | Promise<void>;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function verifyWithToken(verifyToken: string) {
    setBusy(true);
    setError("");
    try {
      const res = await api<VerifyResponse>(ROUTES.AUTH.VERIFY_EMAIL, {
        method: "POST",
        body: JSON.stringify({ token: verifyToken })
      });
      if ("requires2fa" in res && res.requires2fa) {
        router.push(`${loginHref}?reason=verify-2fa`);
        return;
      }
      const session = res as AuthSessionDto & { accessToken: string; refreshToken?: string };
      const switched = await applyDefaultWorkspaceIfNeeded(session, session.accessToken);
      await onSession(switched.session, switched.accessToken, session.refreshToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify email.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (token) {
      void verifyWithToken(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for URL token
  }, [token]);

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage(null);
    setBusy(true);
    try {
      await api(ROUTES.AUTH.RESEND_VERIFICATION, {
        method: "POST",
        body: JSON.stringify({ email: email.trim() })
      });
      setMessage("If your account needs verification, we sent a new link.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend verification email.");
    } finally {
      setBusy(false);
    }
  }

  if (token) {
    return (
      <AuthShell title="Verify email">
        <p className="mb-4 text-sm text-muted-foreground">Confirming your email address…</p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {busy ? <p className="text-sm text-muted-foreground">Working…</p> : null}
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Verify your email">
      <form onSubmit={resend} className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Check your inbox for a verification link, or request a new one below.
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
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={busy}>
          {busy ? "Sending…" : "Resend verification email"}
        </Button>
        <Link href={loginHref} className="text-center text-sm text-primary hover:underline">
          Back to sign in
        </Link>
      </form>
    </AuthShell>
  );
}
