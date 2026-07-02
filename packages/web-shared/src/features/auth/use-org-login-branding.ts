"use client";

import { ROUTES, type PublicTenantDto } from "@kloqra/contracts";
import { useEffect, useState } from "react";
import { publicFetch } from "../../api/client";
import { readOrgSlugCookie } from "./org-slug-cookie";

export type OrgLoginBranding = {
  slug: string;
  name: string;
};

function resolveOrgSlugFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("org")?.trim() || readOrgSlugCookie();
}

export function useOrgLoginBranding(): OrgLoginBranding | null {
  const [branding, setBranding] = useState<OrgLoginBranding | null>(null);

  useEffect(() => {
    const slug = resolveOrgSlugFromLocation();
    if (!slug) {
      setBranding(null);
      return;
    }

    let cancelled = false;
    void publicFetch<PublicTenantDto>(ROUTES.TENANTS.PUBLIC(slug))
      .then((tenant) => {
        if (!cancelled) setBranding(tenant);
      })
      .catch(() => {
        if (!cancelled) setBranding(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return branding;
}

export function orgLoginDescription(branding: OrgLoginBranding | null, fallback: string): string {
  return branding ? `Sign in to ${branding.name}.` : fallback;
}
