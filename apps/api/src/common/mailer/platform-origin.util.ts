/** Platform-admin app origin for password reset and auth emails. */
export function platformClientOrigin(): string {
  const explicit = process.env.PUBLIC_PLATFORM_URL?.trim();
  if (explicit) {
    const parts = explicit
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      const platformLike = parts.find(
        (origin) => origin.includes(":3003") || /platform/i.test(origin)
      );
      return (platformLike ?? parts[0]!).replace(/\/$/, "");
    }
  }

  return "http://localhost:3003";
}
