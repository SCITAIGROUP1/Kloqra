import { adminClientOrigin } from "./admin-origin.util";
import { memberClientOrigin } from "./client-origin.util";
import { platformClientOrigin } from "./platform-origin.util";

export function clientOrigin(): string {
  return memberClientOrigin();
}

/** Second origin in FRONTEND_ORIGIN list, or localhost admin default. */
export function adminOrigin(): string {
  return adminClientOrigin();
}

export function originForNotificationHref(href: string): string {
  const platformPaths = ["/tenants", "/ops"];
  const isPlatform = platformPaths.some((p) => href === p || href.startsWith(`${p}/`));
  if (isPlatform) {
    return platformClientOrigin();
  }

  const adminPaths = [
    "/approvals",
    "/team-management",
    "/exports",
    "/billing",
    "/workspace",
    "/account"
  ];
  const isAdmin = adminPaths.some((p) => href === p || href.startsWith(`${p}/`));
  return isAdmin ? adminOrigin() : clientOrigin();
}
