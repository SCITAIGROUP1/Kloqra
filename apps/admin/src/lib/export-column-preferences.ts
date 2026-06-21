import { DEFAULT_EXPORT_COLUMNS, type ExportReportType } from "@kloqra/contracts";

export type ExportColumnPreferences = Partial<Record<ExportReportType, string[]>>;

const storageKey = (workspaceId: string) => `kloqra-export-columns:${workspaceId}`;

export function defaultColumnsMap(): Record<ExportReportType, string[]> {
  return Object.fromEntries(
    (Object.keys(DEFAULT_EXPORT_COLUMNS) as ExportReportType[]).map((k) => [
      k,
      [...DEFAULT_EXPORT_COLUMNS[k]]
    ])
  ) as Record<ExportReportType, string[]>;
}

function sanitizeColumns(report: ExportReportType, columns: string[] | undefined): string[] | null {
  if (!columns?.length) return null;
  const validKeys = new Set(DEFAULT_EXPORT_COLUMNS[report]);
  const filtered = columns.filter((key) => validKeys.has(key));
  return filtered.length > 0 ? filtered : null;
}

export function loadExportColumnPreferences(workspaceId: string): ExportColumnPreferences | null {
  if (typeof window === "undefined" || !workspaceId) return null;
  try {
    const raw = localStorage.getItem(storageKey(workspaceId));
    if (!raw) return null;
    return JSON.parse(raw) as ExportColumnPreferences;
  } catch {
    return null;
  }
}

export function saveExportColumnPreferences(
  workspaceId: string,
  columns: Record<ExportReportType, string[]>
): void {
  if (typeof window === "undefined" || !workspaceId) return;
  const payload: ExportColumnPreferences = {};
  for (const report of Object.keys(columns) as ExportReportType[]) {
    payload[report] = columns[report];
  }
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(payload));
}

export function mergeColumnPreferences(
  stored: ExportColumnPreferences | null
): Record<ExportReportType, string[]> {
  const defaults = defaultColumnsMap();
  if (!stored) return defaults;

  const merged = { ...defaults };
  for (const report of Object.keys(stored) as ExportReportType[]) {
    const sanitized = sanitizeColumns(report, stored[report]);
    if (sanitized) merged[report] = sanitized;
  }
  return merged;
}
