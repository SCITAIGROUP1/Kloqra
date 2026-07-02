"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  AuthSessionDto,
  LoginRequires2faResponseDto,
  LoginRequiresEmailVerificationResponseDto
} from "@kloqra/contracts";
import { Button, Input, Label } from "@kloqra/ui";
import {
  AuthShell,
  SetPasswordForm,
  applyDefaultWorkspaceIfNeeded,
  canLoginToAdminApp,
  extractFieldErrorsFromMessage,
  hasMultipleWorkspaces,
  resolveAdminLandingPath
} from "@kloqra/web-shared";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

type SetPasswordResponse =
  | (AuthSessionDto & { accessToken: string; refreshToken?: string })
  | LoginRequires2faResponseDto
  | LoginRequiresEmailVerificationResponseDto;

export function AdminSetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useSessionStore((s) => s.setSession);
  const [pendingToken, setPendingToken] = useState(() => searchParams.get("token") ?? "");
  const [totpCode, setTotpCode] = useState("");
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState("");
  const [totpError, setTotpError] = useState("");

  async function finishSession(
    res: AuthSessionDto & { accessToken: string; refreshToken?: string }
  ) {
    const switched = await applyDefaultWorkspaceIfNeeded(res, res.accessToken);
    if (!canLoginToAdminApp(switched.session)) {
      throw new Error("Admin access required");
    }
    setSession(switched.session, switched.accessToken, res.refreshToken);

    try {
      const multi = await hasMultipleWorkspaces(switched.session.workspaceId, "ADMIN");
      if (multi) {
        router.push("/select-workspace");
        return;
      }
    } catch (err) {
      console.error("Failed to check workspaces:", err);
    }

    router.push(await resolveAdminLandingPath(switched.session, switched.session.workspaceId));
  }

  async function complete2fa(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setTotpError("");
    if (!/^\d{6}$/.test(totpCode.trim())) {
      setTotpError("Authentication code must be 6 digits");
      return;
    }
    try {
      const res = await api<SetPasswordResponse>(ROUTES.AUTH.LOGIN, {
        method: "POST",
        body: JSON.stringify({ email: "x@x.com", password: "x", pendingToken, totpCode })
      });
      if ("requires2fa" in res && res.requires2fa) {
        setTotpError("Invalid authentication code.");
        return;
      }
      await finishSession(res as AuthSessionDto & { accessToken: string });
    } catch (err) {
      if (err instanceof Error) {
        const parsed = extractFieldErrorsFromMessage(err.message, {
          totpCode: ["Authentication code", "Totp Code"]
        });
        setTotpError(parsed.fieldErrors.totpCode ?? "");
        setError(parsed.formError);
      } else {
        setError("Could not verify code.");
      }
    }
  }

  async function handleSetPassword(newPassword: string) {
    const res = await api<SetPasswordResponse>(ROUTES.AUTH.SET_PASSWORD, {
      method: "POST",
      body: JSON.stringify({ pendingToken, newPassword })
    });
    if ("requires2fa" in res && res.requires2fa) {
      setPendingToken(res.pendingToken);
      setNeeds2fa(true);
      return;
    }
    if ("requiresEmailVerification" in res && res.requiresEmailVerification) {
      router.push(`/verify-email?email=${encodeURIComponent(res.email)}`);
      return;
    }
    await finishSession(res as AuthSessionDto & { accessToken: string });
  }

  return (
    <AuthShell title={needs2fa ? "Two-factor authentication" : "Set your password"}>
      <p className="mb-4 text-sm text-muted-foreground">
        {needs2fa
          ? "Enter the code from your authenticator app to finish signing in."
          : "Choose a new password before continuing."}
      </p>
      {needs2fa ? (
        <form onSubmit={complete2fa} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="totp">Authentication code</Label>
            <Input
              id="totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={totpCode}
              onChange={(e) => {
                setTotpCode(e.target.value);
                if (totpError) setTotpError("");
              }}
              maxLength={6}
              aria-invalid={Boolean(totpError)}
            />
            {totpError ? <p className="text-xs text-destructive">{totpError}</p> : null}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit">Verify</Button>
        </form>
      ) : (
        <SetPasswordForm pendingToken={pendingToken} onSubmit={handleSetPassword} />
      )}
    </AuthShell>
  );
}
