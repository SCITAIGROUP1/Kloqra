/** Admin app base URL for billing checkout return links and emails. */
export function resolvePublicAdminUrl(): string {
  return process.env.PUBLIC_ADMIN_URL?.trim() || "http://localhost:3002";
}
