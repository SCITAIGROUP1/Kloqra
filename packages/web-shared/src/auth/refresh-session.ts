import { ROUTES } from "@kloqra/contracts";
import type { AuthSessionDto } from "@kloqra/contracts";
import { getApiBase } from "../api/base";
import { useSessionStore } from "../stores/session.store";

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app";

/** Silent refresh using httpOnly cookie; returns new access token or null. */
export async function tryRefreshSession(): Promise<string | null> {
  const res = await fetch(`${getApiBase()}${ROUTES.AUTH.REFRESH}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Scope": AUTH_SCOPE
    }
  });
  if (!res.ok) return null;
  const body = (await res.json()) as AuthSessionDto & { accessToken?: string };
  if (!body.accessToken) return null;
  useSessionStore.getState().setSession(body, body.accessToken);
  return body.accessToken;
}
