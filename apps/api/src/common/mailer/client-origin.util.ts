export function clientOrigin(): string {
  return memberClientOrigin();
}

/** Member-facing links (login, verify email) should target the client app, not admin. */
export function memberClientOrigin(): string {
  const explicit = process.env.PUBLIC_CLIENT_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const origins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const clientLike = origins.find((origin) => !origin.includes(":3002") && !/admin/i.test(origin));

  return (clientLike ?? origins[0] ?? "http://localhost:3000").replace(/\/$/, "");
}
