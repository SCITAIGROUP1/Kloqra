"use client";

import {
  VerifyEmailPageContent,
  establishTenantSession,
  hasMultipleWorkspaces
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
      onSession={async (session, accessToken, refreshToken) => {
        establishTenantSession(session, accessToken, refreshToken);
        const multi = await hasMultipleWorkspaces(session.workspaceId);
        if (multi) {
          router.replace("/select-workspace");
        } else {
          router.replace("/dashboard");
        }
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
