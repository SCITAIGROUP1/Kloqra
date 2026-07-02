"use client";

import { PLATFORM_LOGIN_DESCRIPTION, PLATFORM_PORTAL_LABEL, ROUTES } from "@kloqra/contracts";
import type {
  Platform2faSetupEnableResponseDto,
  PlatformSessionWithTokenDto
} from "@kloqra/contracts";
import { Button } from "@kloqra/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { AuthShell } from "../../components/auth-shell";
import { TwoFaSetupPanel } from "../../features/account/settings/sections/two-fa-setup-panel";
import { usePlatformSessionStore } from "../../stores/platform-session.store";
import { extractFieldErrorsFromMessage } from "../../utils/form-errors";

export function PlatformSetup2faForm({ pendingToken }: { pendingToken: string }) {
  const router = useRouter();
  const setSession = usePlatformSessionStore((s) => s.setSession);
  const [setup, setSetup] = useState<Platform2faSetupEnableResponseDto | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!pendingToken) return;
    void api<Platform2faSetupEnableResponseDto>(ROUTES.AUTH.PLATFORM_2FA_SETUP_ENABLE, {
      method: "POST",
      body: JSON.stringify({ pendingToken })
    })
      .then(setSetup)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not start two-factor setup.");
      })
      .finally(() => setLoading(false));
  }, [pendingToken]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCodeError("");
    if (!/^\d{6}$/.test(code.trim())) {
      setCodeError("Authentication code must be 6 digits");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<PlatformSessionWithTokenDto>(ROUTES.AUTH.PLATFORM_COMPLETE_2FA_SETUP, {
        method: "POST",
        body: JSON.stringify({ pendingToken, code: code.trim() })
      });
      setSession(res, res.accessToken, res.refreshToken);
      router.push("/tenants");
    } catch (err) {
      if (err instanceof Error) {
        const parsed = extractFieldErrorsFromMessage(err.message, {
          code: ["Authentication code", "Code"]
        });
        setCodeError(parsed.fieldErrors.code ?? "");
        setError(parsed.formError);
        return;
      }
      setError("Could not complete two-factor setup.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!pendingToken) {
    return (
      <AuthShell
        title="Set up two-factor authentication"
        portalLabel={PLATFORM_PORTAL_LABEL}
        description={PLATFORM_LOGIN_DESCRIPTION}
        variant="platform"
      >
        <p className="text-sm text-destructive">Your setup session expired. Sign in again.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set up two-factor authentication"
      portalLabel={PLATFORM_PORTAL_LABEL}
      description="Secure your platform admin account before accessing the console."
      variant="platform"
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Preparing authenticator setup…</p>
      ) : setup ? (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <TwoFaSetupPanel
            secret={setup.secret}
            otpauthUrl={setup.otpauthUrl}
            code={code}
            onCodeChange={setCode}
          />
          {codeError ? <p className="text-xs text-destructive">{codeError}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Verifying…" : "Enable and continue"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-destructive">{error || "Could not start two-factor setup."}</p>
      )}
    </AuthShell>
  );
}
