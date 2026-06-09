import type {
  ExportBodyDto,
  ExportPreviewResponseDto,
  ExportReportType
} from "@chronomint/contracts";
import { normalizeGroupByFromBody } from "@/lib/export-group-by";

const DEFAULT_REPORT_TYPES: ExportReportType[] = ["time_entries"];

/** Client-side guard for preset bodies and API JSON that omit newer fields. */
export function normalizeExportBody(body: Partial<ExportBodyDto>): ExportBodyDto {
  const reportTypes = Array.isArray(body.reportTypes)
    ? body.reportTypes.filter(Boolean)
    : DEFAULT_REPORT_TYPES;

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
    projectId: body.projectId,
    userId: body.userId,
    categoryId: body.categoryId,
    taskId: body.taskId,
    teamOnly: body.teamOnly
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
    detail: data.detail ?? ""
  };
}
