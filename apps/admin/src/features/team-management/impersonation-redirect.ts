export function buildClientImpersonationUrl(clientUrl: string, handoffToken: string): string {
  if (!handoffToken.trim()) {
    throw new Error("Impersonation handoff token missing from API response");
  }
  const cleanUrl =
    clientUrl
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)[0] ?? "http://localhost:3000";
  return `${cleanUrl.replace(/\/$/, "")}/dashboard?handoff=${encodeURIComponent(handoffToken)}`;
}
