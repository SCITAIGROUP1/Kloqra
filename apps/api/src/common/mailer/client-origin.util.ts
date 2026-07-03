export function clientOrigin(): string {
  return memberClientOrigin();
}

/** Member-facing links (login, verify email) should target the client app, not admin. */
export function memberClientOrigin(): string {
  const explicit = process.env.PUBLIC_CLIENT_URL?.trim();
  if (explicit) {
    const parts = explicit
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      const clientLike = parts.find(
        (origin) => !origin.includes(":3002") && !/admin/i.test(origin)
      );
      return (clientLike ?? parts[0]!).replace(/\/$/, "");
    }
  }

  return "http://localhost:3000";
}
