import { tryRefreshPlatformSession } from "../auth/bootstrap-platform-session";
import { isAccessTokenExpired } from "../auth/jwt-payload";
import { tryRefreshSession } from "../auth/refresh-session";
import { isWorkspaceMismatchError, resolveApiWorkspaceId } from "../auth/workspace-context";
import { getPlatformAccessToken, usePlatformSessionStore } from "../stores/platform-session.store";
import { getAccessToken, useSessionStore } from "../stores/session.store";
import { getApiBase } from "./base";
import { invalidateListItemsCache } from "./list-items-cache";

export { getApiBase } from "./base";

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app";

/** Coalesce concurrent identical GET requests (e.g. React Strict Mode double-mount). */
const inflightGetRequests = new Map<string, Promise<unknown>>();

function buildInflightGetKey(method: string, path: string, workspaceId?: string | null): string {
  return `${method}:${path}:${workspaceId ?? ""}`;
}

function isDedupeEligibleRequest(method: string, options: ApiOptions): boolean {
  if (options._retry) return false;
  if (method !== "GET") return false;
  if (options.body != null) return false;
  return true;
}

type ApiOptions = RequestInit & {
  workspaceId?: string;
  /** Internal: skip one 401 refresh retry */
  _retry?: boolean;
};

type ApiErrorBody = {
  message?: string | string[];
  code?: string;
  details?: {
    reason?: string;
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
    status?: string;
  };
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: ApiErrorBody["details"];

  constructor(message: string, status: number, code?: string, details?: ApiErrorBody["details"]) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const FATAL_AUTH_REASONS = new Set([
  "token_invalid",
  "token_malformed",
  "token_wrong_type",
  "missing_claims",
  "scope_mismatch",
  "session_revoked"
]);

function humanizeFieldKey(key: string): string {
  const lastSegment = key.split(".").at(-1) ?? key;
  const spaced = lastSegment
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeFieldError(fieldKey: string, message: string): string {
  const label = humanizeFieldKey(fieldKey);

  if (message === "Required" || message.toLowerCase() === "required") {
    return `${label} is required`;
  }

  if (/invalid email/i.test(message)) {
    return `${label} must be a valid email address`;
  }

  const minCharMatch = message.match(/^String must contain at least (\d+) character\(s\)$/i);
  if (minCharMatch) {
    const min = Number(minCharMatch[1]);
    return min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`;
  }

  const maxCharMatch = message.match(/^String must contain at most (\d+) character\(s\)$/i);
  if (maxCharMatch) {
    const max = Number(maxCharMatch[1]);
    return `${label} must be at most ${max} characters`;
  }

  // Keep other Zod messages as-is; they are usually already human readable.
  return message;
}

async function parseApiErrorBody(res: Response): Promise<{ message: string; body: ApiErrorBody }> {
  let message = `Request failed (${res.status})`;
  let body: ApiErrorBody = {};
  try {
    body = (await res.json()) as ApiErrorBody;
    if (typeof body.message === "string") message = body.message;
    else if (Array.isArray(body.message)) message = body.message.join(", ");
    const fieldMsgs = body.details?.fieldErrors
      ? Object.entries(body.details.fieldErrors).flatMap(([k, v]) =>
          (v ?? []).map((m) => normalizeFieldError(k, m))
        )
      : [];
    const formMsgs = body.details?.formErrors ?? [];
    const extra = [...formMsgs, ...fieldMsgs];
    if (extra.length > 0) message = `${message} — ${extra.join("; ")}`;
  } catch {
    /* non-JSON */
  }
  return { message, body };
}

function handleSessionFailure(message: string): void {
  if (typeof window === "undefined") return;
  if (AUTH_SCOPE === "platform") return;
  if (isWorkspaceMismatchError(message)) {
    useSessionStore.getState().clear();
    const loginPath = "/login";
    if (!window.location.pathname.startsWith(loginPath)) {
      window.location.assign(`${loginPath}?reason=workspace`);
    }
  }
}

function handleFatalAuthFailure(): void {
  if (typeof window === "undefined") return;
  if (AUTH_SCOPE === "platform") {
    usePlatformSessionStore.getState().clear();
  } else {
    useSessionStore.getState().clear();
  }
  const loginPath = "/login";
  if (!window.location.pathname.startsWith(loginPath)) {
    window.location.assign(loginPath);
  }
}

function readAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return AUTH_SCOPE === "platform" ? getPlatformAccessToken() : getAccessToken();
}

async function refreshAuthToken(): Promise<string | null> {
  if (AUTH_SCOPE === "platform") {
    return tryRefreshPlatformSession();
  }
  return tryRefreshSession();
}

function shouldAttemptRefresh(status: number, body: ApiErrorBody): boolean {
  if (status !== 401) return false;
  const reason = body.details?.reason;
  if (reason && FATAL_AUTH_REASONS.has(reason)) return false;
  return true;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const ws = resolveApiWorkspaceId(options.workspaceId);
  const dedupeKey = isDedupeEligibleRequest(method, options)
    ? buildInflightGetKey(method, path, ws)
    : null;

  if (dedupeKey) {
    const inflight = inflightGetRequests.get(dedupeKey);
    if (inflight) return inflight as Promise<T>;
  }

  const requestPromise = executeApiRequest<T>(path, options, method, ws);

  if (dedupeKey) {
    inflightGetRequests.set(dedupeKey, requestPromise);
    try {
      return await requestPromise;
    } finally {
      inflightGetRequests.delete(dedupeKey);
    }
  }

  return requestPromise;
}

async function executeApiRequest<T>(
  path: string,
  options: ApiOptions,
  method: string,
  ws: string | null | undefined
): Promise<T> {
  const headers: Record<string, string> = {
    "X-Auth-Scope": AUTH_SCOPE,
    ...(options.headers as Record<string, string>)
  };

  if (typeof FormData === "undefined" || !(options.body instanceof FormData)) {
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  if (ws && AUTH_SCOPE !== "platform") headers["X-Workspace-Id"] = ws;

  let token = readAuthToken();
  if (token && isAccessTokenExpired(token)) {
    token = await refreshAuthToken();
  }
  if (token && !isAccessTokenExpired(token)) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });

  if (!res.ok) {
    const { message, body } = await parseApiErrorBody(res);

    if (
      !options._retry &&
      typeof window !== "undefined" &&
      shouldAttemptRefresh(res.status, body)
    ) {
      const refreshed = await refreshAuthToken();
      if (refreshed) {
        return api<T>(path, { ...options, _retry: true });
      }
    }

    if (res.status === 401 && body.details?.reason && FATAL_AUTH_REASONS.has(body.details.reason)) {
      handleFatalAuthFailure();
    }

    if (res.status === 403 && isWorkspaceMismatchError(message)) {
      handleSessionFailure(message);
    }
    throw new ApiRequestError(message, res.status, body.code, body.details);
  }

  if (method !== "GET" && method !== "HEAD") {
    invalidateListItemsCache(ws ? { workspaceId: ws } : undefined);
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
    const { message } = await parseApiErrorBody(res);
    throw new Error(message);
  }
  if (res.headers.get("content-type")?.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return undefined as T;
}
