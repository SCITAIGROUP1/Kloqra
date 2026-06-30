import type { ExportBodyDto } from "@kloqra/contracts";

export type StoredExportPreset = {
  id: string;
  name: string;
  body: ExportBodyDto;
};

const key = (workspaceId: string) => `kloqra-export-presets:${workspaceId}`;

export function listLocalExportPresets(workspaceId: string): StoredExportPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(workspaceId));
    if (!raw) return [];
    return JSON.parse(raw) as StoredExportPreset[];
  } catch {
    return [];
  }
}

export function saveLocalExportPreset(
  workspaceId: string,
  name: string,
  body: ExportBodyDto
): StoredExportPreset[] {
  const presets = listLocalExportPresets(workspaceId);
  const id = crypto.randomUUID();
  const next = [...presets.filter((p) => p.name !== name), { id, name, body }];
  localStorage.setItem(key(workspaceId), JSON.stringify(next));
  return next;
}

export function deleteLocalExportPreset(workspaceId: string, id: string): StoredExportPreset[] {
  const next = listLocalExportPresets(workspaceId).filter((p) => p.id !== id);
  localStorage.setItem(key(workspaceId), JSON.stringify(next));
  return next;
}
