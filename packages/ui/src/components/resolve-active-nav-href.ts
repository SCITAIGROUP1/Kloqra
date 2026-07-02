/**
 * Picks the single nav href that should appear active for the current path.
 * Exact matches win; otherwise the longest prefix match wins (e.g. `/account/organization`
 * over `/account`).
 */
export function resolveActiveNavHref(pathname: string, hrefs: readonly string[]): string | null {
  if (!pathname) return null;

  const exact = hrefs.find((href) => pathname === href);
  if (exact) return exact;

  let best: string | null = null;
  for (const href of hrefs) {
    if (pathname.startsWith(`${href}/`) && (!best || href.length > best.length)) {
      best = href;
    }
  }
  return best;
}
