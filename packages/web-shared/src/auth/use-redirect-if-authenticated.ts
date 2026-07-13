"use client";

import type { AuthSessionDto } from "@kloqra/contracts";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { bootstrapSession, type BootstrapOptions } from "./bootstrap-session";

type UseRedirectIfAuthenticatedOptions = {
  resolvePath: (session: AuthSessionDto) => Promise<string>;
  bootstrapOptions?: BootstrapOptions;
};

/**
 * On auth screens: if a session can be restored, replace to the post-auth path
 * instead of showing the login form.
 */
export function useRedirectIfAuthenticated({
  resolvePath,
  bootstrapOptions
}: UseRedirectIfAuthenticatedOptions): { checking: boolean } {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const resolvePathRef = useRef(resolvePath);
  const bootstrapOptionsRef = useRef(bootstrapOptions);
  resolvePathRef.current = resolvePath;
  bootstrapOptionsRef.current = bootstrapOptions;

  useEffect(() => {
    let cancelled = false;

    void bootstrapSession(bootstrapOptionsRef.current ?? {})
      .then(async (result) => {
        if (cancelled) return;
        if (!result.ok) {
          setChecking(false);
          return;
        }
        const path = await resolvePathRef.current(result.session);
        if (cancelled) return;
        router.replace(path);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return { checking };
}
