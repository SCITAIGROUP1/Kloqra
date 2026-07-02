import { BRAND_NAME } from "@kloqra/contracts";

export type PlatformContextMode = "console" | "account";

export type PlatformContextBreadcrumbSegment = {
  label: string;
  href?: string;
};

export function resolvePlatformContextBreadcrumb(options: {
  contextMode: PlatformContextMode;
}): PlatformContextBreadcrumbSegment[] {
  const { contextMode } = options;

  if (contextMode === "account") {
    return [{ label: BRAND_NAME, href: "/tenants" }, { label: "Account" }];
  }

  return [{ label: BRAND_NAME }, { label: "Console" }];
}
