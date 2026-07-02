"use client";

import {
  VerifyEmailPageContent,
  canLoginToAdminApp,
  hasMultipleWorkspaces,
  resolveAdminLandingPath
} from "@kloqra/web-shared";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useSessionStore } from "@/stores/session.store";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useSessionStore((s) => s.setSession);
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
        setSession(session, accessToken, refreshToken);
        const multi = await hasMultipleWorkspaces(session.workspaceId, "ADMIN");
        if (multi) {
          router.push("/select-workspace");
          return;
        }
        if (session.tenantRole === "OWNER" || session.tenantRole === "ADMIN") {
          router.push(await resolveAdminLandingPath(session, session.workspaceId));
          return;
        }
        router.push("/dashboard");
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
