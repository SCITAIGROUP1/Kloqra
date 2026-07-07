"use client";

import {
  VerifyEmailPageContent,
  canLoginToAdminApp,
  establishTenantSession,
  hasMultipleWorkspaces,
  resolveAdminOnboardingPath
} from "@kloqra/web-shared";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? undefined;
  const email = searchParams.get("email") ?? "";

  return (
    <VerifyEmailPageContent
      token={token}
      email={email}
      loginHref="/login"
      onSession={async (session, accessToken, refreshToken) => {
        if (!canLoginToAdminApp(session)) {
          throw new Error("Admin access required");
        }
        establishTenantSession(session, accessToken, refreshToken);
        if (session.requiresWorkspaceSetup) {
          router.replace(await resolveAdminOnboardingPath(session));
          return;
        }
        const multi = await hasMultipleWorkspaces(session.workspaceId!, "ADMIN");
        if (multi) {
          router.replace("/select-workspace");
          return;
        }
        if (session.tenantRole === "OWNER" || session.tenantRole === "ADMIN") {
          router.replace(await resolveAdminOnboardingPath(session));
          return;
        }
        router.replace("/dashboard");
      }}
    />
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
