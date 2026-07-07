/** API auth failure reasons that require local sign-out (no silent retry). */
export const FATAL_AUTH_REASONS = new Set([
  "token_invalid",
  "token_malformed",
  "token_wrong_type",
  "missing_claims",
  "scope_mismatch",
  "session_revoked"
]);

export type AuthErrorBody = {
  message?: string | string[];
  code?: string;
  details?: {
    reason?: string;
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
    status?: string;
  };
};

export function readAuthFailureReason(body: AuthErrorBody | undefined): string | undefined {
  return body?.details?.reason;
}

/** HTTP 401/403 from refresh, or explicit fatal reason in the body. */
export function isFatalAuthResponse(status: number, body?: AuthErrorBody): boolean {
  if (status === 401 || status === 403) return true;
  const reason = readAuthFailureReason(body);
  return Boolean(reason && FATAL_AUTH_REASONS.has(reason));
}
