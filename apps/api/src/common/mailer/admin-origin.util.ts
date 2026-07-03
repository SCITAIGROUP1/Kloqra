/** Admin app origin for tenant-owner provisioning emails. */
export function adminClientOrigin(): string {
  const explicit = process.env.PUBLIC_ADMIN_URL?.trim();
  if (explicit) {
    const parts = explicit
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      const adminLike = parts.find((origin) => origin.includes(":3002") || /admin/i.test(origin));
      return (adminLike ?? parts[0]!).replace(/\/$/, "");
    }
  }

  return "http://localhost:3002";
}
