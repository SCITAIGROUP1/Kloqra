"use client";

import { ROUTES, type InviteHandoffResponseDto } from "@kloqra/contracts";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";

type UseInviteHandoffLoginOptions = {
  setPasswordPath?: string;
  onPrefill: (email: string, password: string) => void;
  onError?: (message: string) => void;
};

function buildSetPasswordUrl(setPasswordPath: string, handoff: InviteHandoffResponseDto): string {
  const params = new URLSearchParams({
    token: handoff.pendingToken
  });
  if (handoff.emailVerificationToken) {
    params.set("verifyToken", handoff.emailVerificationToken);
  }
  return `${setPasswordPath}?${params.toString()}`;
}

/**
 * Consumes `?invite=` from invite emails: prefills credentials and optionally
 * auto-continues to set-password (and verify-email) when `auto=1`.
 */
export function useInviteHandoffLogin({
  setPasswordPath = "/set-password",
  onPrefill,
  onError
}: UseInviteHandoffLoginOptions): { loading: boolean } {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const auto = searchParams.get("auto") === "1";
  const consumedRef = useRef(false);
  const [loading, setLoading] = useState(Boolean(inviteToken));

  useEffect(() => {
    if (!inviteToken || consumedRef.current) return;
    consumedRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const handoff = await api<InviteHandoffResponseDto>(ROUTES.AUTH.INVITE_HANDOFF, {
          method: "POST",
          body: JSON.stringify({ inviteToken })
        });
        if (cancelled) return;
        onPrefill(handoff.email, handoff.temporaryPassword);
        if (auto) {
          router.replace(buildSetPasswordUrl(setPasswordPath, handoff));
          return;
        }
      } catch (err) {
        if (cancelled) return;
        onError?.(err instanceof Error ? err.message : "Invite link is invalid or expired.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inviteToken, auto, onPrefill, onError, router, setPasswordPath]);

  return { loading };
}
