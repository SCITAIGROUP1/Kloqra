const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export async function api<T>(
  path: string,
  options: RequestInit & { workspaceId?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>)
  };
  if (options.workspaceId) headers["X-Workspace-Id"] = options.workspaceId;
  const token = typeof window !== "undefined" ? localStorage.getItem("cm-access-token") : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as {
        message?: string | string[];
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
      if (extra.length > 0) {
        message = `${message} — ${extra.join("; ")}`;
      }
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) return res.json() as Promise<T>;
  return res.blob() as unknown as T;
}

export function apiDownload(path: string, workspaceId: string) {
  const token = localStorage.getItem("cm-access-token");
  return fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Workspace-Id": workspaceId
    },
    credentials: "include"
  });
}

export function apiDownloadPost(path: string, workspaceId: string, body: unknown) {
  const token = localStorage.getItem("cm-access-token");
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Workspace-Id": workspaceId
    },
    credentials: "include",
    body: JSON.stringify(body)
  });
}
