/** Build a login URL that prefills invite credentials and can auto-continue to set-password. */
export function buildInviteLoginUrl(clientOrigin: string, inviteHandoffToken: string): string {
  const base = clientOrigin.replace(/\/$/, "");
  const url = new URL(`${base}/login`);
  url.searchParams.set("invite", inviteHandoffToken);
  url.searchParams.set("auto", "1");
  return url.toString();
}
