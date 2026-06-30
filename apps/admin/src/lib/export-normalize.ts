import type { ExportBodyDto, ExportPreviewResponseDto, ExportReportType } from "@kloqra/contracts";
import { normalizeGroupByFromBody } from "@/lib/export-group-by";

const DEFAULT_REPORT_TYPES: ExportReportType[] = ["time_entries"];

function dedupeIds(primary: string[] | undefined, legacy: string | undefined): string[] {
  const fromArr = Array.isArray(primary)
    ? primary.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  const legacyId = typeof legacy === "string" && legacy.length > 0 ? [legacy] : [];
  return [...new Set([...fromArr, ...legacyId])];
}

/** Client-side guard for preset bodies and API JSON that omit newer fields. */
export function normalizeExportBody(body: Partial<ExportBodyDto>): ExportBodyDto {
  const reportTypes = Array.isArray(body.reportTypes)
    ? body.reportTypes.filter(Boolean)
    : DEFAULT_REPORT_TYPES;

  const projectIds = dedupeIds(body.projectIds, body.projectId);
  const userIds = dedupeIds(body.userIds, body.userId);
  const exportPurpose =
    typeof body.exportPurpose === "string" && body.exportPurpose.trim()
      ? body.exportPurpose.trim().slice(0, 48)
      : undefined;

  return {
    from: body.from ?? new Date().toISOString(),
    to: body.to ?? new Date().toISOString(),
    billable: body.billable ?? "all",
    reportTypes: reportTypes.length > 0 ? reportTypes : DEFAULT_REPORT_TYPES,
    format: body.format ?? "xlsx",
    groupBy: normalizeGroupByFromBody(
      body.groupBy as ExportBodyDto["groupBy"] | string | undefined
    ),
    sheetLayout: body.sheetLayout ?? "standard",
    columns: body.columns,
    ...(projectIds.length ? { projectIds } : {}),
    ...(userIds.length ? { userIds } : {}),
    ...(projectIds[0] ? { projectId: projectIds[0] } : {}),
    ...(userIds[0] ? { userId: userIds[0] } : {}),
    categoryId: body.categoryId,
    taskId: body.taskId,
    teamOnly: body.teamOnly,
    ...(exportPurpose ? { exportPurpose } : {})
  };
}

export function normalizeExportPreview(
  data: Partial<ExportPreviewResponseDto> | null | undefined
): ExportPreviewResponseDto | null {
  if (!data) return null;

  return {
    counts: data.counts ?? {},
    totalLogRows: data.totalLogRows ?? 0,
    isEmpty: data.isEmpty ?? true,
    sheets: Array.isArray(data.sheets) ? data.sheets : [],
    headline: data.headline ?? "Export preview",
    detail: data.detail ?? "",
    sampleRows: Array.isArray(data.sampleRows) ? data.sampleRows : undefined,
    estimatedRowCount: data.estimatedRowCount,
    warnLargeExport: data.warnLargeExport
  };
}
