import { ApiRequestError } from "../api/client";
import { isFatalAuthResponse, type AuthErrorBody } from "./auth-fatal-reasons";

/** Why session bootstrap could not complete. */
export type BootstrapFailureReason = "unauthenticated" | "forbidden" | "transient";

/** Map thrown API/network errors to a bootstrap failure reason. */
export function classifyBootstrapError(err: unknown): BootstrapFailureReason {
  if (err instanceof ApiRequestError) {
    if (err.status === 403) return "forbidden";
    const body: AuthErrorBody = {
      code: err.code,
      details: err.details
    };
    if (isFatalAuthResponse(err.status, body)) {
      return "unauthenticated";
    }
    return "transient";
  }
  return "transient";
}

/** True when the shell should send the user to login (not retry). */
export function shouldRedirectBootstrapToLogin(
  reason: BootstrapFailureReason | undefined
): boolean {
  return reason === "unauthenticated" || reason === "forbidden" || reason === undefined;
}
