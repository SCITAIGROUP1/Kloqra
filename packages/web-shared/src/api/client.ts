import { tryRefreshSession } from "../auth/refresh-session";
import { getEffectiveWorkspaceId, isWorkspaceMismatchError } from "../auth/workspace-context";
import { getAccessToken, useSessionStore } from "../stores/session.store";
import { getApiBase } from "./base";

export { getApiBase } from "./base";

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app";

type ApiOptions = RequestInit & {
  workspaceId?: string;
  /** Internal: skip one 401 refresh retry */
  _retry?: boolean;
};

async function parseApiError(res: Response): Promise<string> {
  let message = `Request failed (${res.status})`;
  try {
    const body = (await res.json()) as {
      message?: string | string[];
      code?: string;
      details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
    };
    if (typeof body.message === "string") message = body.message;
    else if (Array.isArray(body.message)) message = body.message.join(", ");
    const fieldMsgs = body.details?.fieldErrors
      ? Object.entries(body.details.fieldErrors).flatMap(([k, v]) =>
          (v ?? []).map((m) => `${k}: ${m}`)
        )
      : [];
    const formMsgs = body.details?.formErrors ?? [];
    const extra = [...formMsgs, ...fieldMsgs];
    if (extra.length > 0) message = `${message} — ${extra.join("; ")}`;
  } catch {
    /* non-JSON */
  }
  return message;
}

function handleSessionFailure(message: string): void {
  if (typeof window === "undefined") return;
  if (isWorkspaceMismatchError(message)) {
    useSessionStore.getState().clear();
    const loginPath = AUTH_SCOPE === "admin" ? "/login" : "/login";
    if (!window.location.pathname.startsWith(loginPath)) {
      window.location.assign(`${loginPath}?reason=workspace`);
    }
  }
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Auth-Scope": AUTH_SCOPE,
    ...(options.headers as Record<string, string>)
  };

  const ws = options.workspaceId ?? getEffectiveWorkspaceId();
  if (ws) headers["X-Workspace-Id"] = ws;

  const token = typeof window !== "undefined" ? getAccessToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });

  if (res.status === 401 && !options._retry && typeof window !== "undefined") {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return api<T>(path, { ...options, _retry: true });
    }
  }

  if (!res.ok) {
    const message = await parseApiError(res);
    if (res.status === 403 && isWorkspaceMismatchError(message)) {
      handleSessionFailure(message);
    }
    throw new Error(message);
  }

  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) return res.json() as Promise<T>;
  return res.blob() as unknown as T;
}

/** Unauthenticated fetch for public share/invite routes. */
export async function publicFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>)
    }
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? `Request failed (${res.status})`);
  }
  if (res.headers.get("content-type")?.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return undefined as T;
}
