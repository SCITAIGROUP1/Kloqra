export const ORG_SLUG_COOKIE = "kloqra_org_slug";

export function readOrgSlugCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)kloqra_org_slug=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
