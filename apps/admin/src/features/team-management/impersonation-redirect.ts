export function buildClientImpersonationUrl(clientUrl: string, handoffToken: string): string {
  if (!handoffToken.trim()) {
    throw new Error("Impersonation handoff token missing from API response");
  }
  return `${clientUrl}/dashboard?handoff=${encodeURIComponent(handoffToken)}`;
}
