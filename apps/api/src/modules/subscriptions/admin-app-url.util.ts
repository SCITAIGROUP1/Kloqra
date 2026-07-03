/** Admin app base URL for billing checkout return links and emails. */
export function resolvePublicAdminUrl(): string {
  const raw = process.env.PUBLIC_ADMIN_URL?.trim();
  if (!raw) return "http://localhost:3002";
  const parts = raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (parts.length === 0) return "http://localhost:3002";
  const adminLike = parts.find((origin) => origin.includes(":3002") || /admin/i.test(origin));
  return (adminLike ?? parts[0]!).replace(/\/$/, "");
}
