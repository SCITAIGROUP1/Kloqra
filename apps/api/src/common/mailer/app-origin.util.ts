export function clientOrigin(): string {
  const raw = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
  return raw.split(",")[0]?.trim() || "http://localhost:3000";
}

/** Second origin in FRONTEND_ORIGIN list, or localhost admin default. */
export function adminOrigin(): string {
  const parts = (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000,http://localhost:3002")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts[1] ?? parts[0] ?? "http://localhost:3002";
}

export function originForNotificationHref(href: string): string {
  const adminPaths = ["/approvals", "/team-management", "/exports", "/billing", "/workspace"];
  const isAdmin = adminPaths.some((p) => href === p || href.startsWith(`${p}/`));
  return isAdmin ? adminOrigin() : clientOrigin();
}
