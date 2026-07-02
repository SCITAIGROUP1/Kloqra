/** Admin app origin for tenant-owner provisioning emails. */
export function adminClientOrigin(): string {
  const explicit = process.env.PUBLIC_ADMIN_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const origins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:3002")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const adminLike = origins.find((origin) => origin.includes(":3002") || /admin/i.test(origin));

  return (adminLike ?? origins[0] ?? "http://localhost:3002").replace(/\/$/, "");
}
