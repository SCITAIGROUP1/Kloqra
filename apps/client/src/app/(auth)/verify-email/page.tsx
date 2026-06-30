"use client";

import { VerifyEmailPageContent, hasMultipleWorkspaces } from "@kloqra/web-shared";
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
      onSession={async (session, accessToken, refreshToken) => {
        setSession(session, accessToken, refreshToken);
        const multi = await hasMultipleWorkspaces(session.workspaceId);
        if (multi) {
          router.push("/select-workspace");
        } else {
          router.push("/timer");
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
