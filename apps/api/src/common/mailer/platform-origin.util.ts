/** Platform-admin app origin for password reset and auth emails. */
export function platformClientOrigin(): string {
  const explicit = process.env.PUBLIC_PLATFORM_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const origins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:3003")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const platformLike = origins.find(
    (origin) => origin.includes(":3003") || /platform/i.test(origin)
  );

  return (platformLike ?? origins[0] ?? "http://localhost:3003").replace(/\/$/, "");
}
