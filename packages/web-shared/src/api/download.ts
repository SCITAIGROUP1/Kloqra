import { parseContentDispositionFilename } from "@kloqra/contracts";
import { getAccessToken } from "../stores/session.store";
import { getApiBase } from "./base";

export function apiDownloadPost(path: string, workspaceId: string, body: unknown) {
  const token = getAccessToken();
  return fetch(`${getApiBase()}${path}`, {
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

export async function saveDownloadResponse(res: Response, fallbackFilename: string): Promise<void> {
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const filename =
    parseContentDispositionFilename(res.headers.get("content-disposition")) ?? fallbackFilename;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
