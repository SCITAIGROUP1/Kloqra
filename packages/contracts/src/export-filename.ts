import { BRAND_NAME } from "./brand.js";
import type { ExportBodyDto, ExportReportType, ExportSheetLayout } from "./dto/export.dto.js";

const BRAND_SLUG = BRAND_NAME.toLowerCase();

/** Safe path segment for Content-Disposition filenames (ASCII). */
export function sanitizeFilenameSegment(value: string, maxLen = 48): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen);
  return slug || "export";
}

function parseDateOnly(iso: string): Date | null {
  const d = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const parsed = new Date(`${d}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Human-readable, filesystem-safe date range for export filenames. */
export function formatExportDateRange(from: string, to: string): string {
  const start = parseDateOnly(from);
  const end = parseDateOnly(to);
  if (!start || !end) return "unknown-date";

  const sy = start.getUTCFullYear();
  const sm = start.getUTCMonth();
  const sd = start.getUTCDate();
  const ey = end.getUTCFullYear();
  const em = end.getUTCMonth();
  const ed = end.getUTCDate();
  const smon = MONTHS[sm] ?? "unk";

  if (sy === ey && sm === em && sd === ed) {
    return `${smon}-${sd}-${sy}`;
  }

  const fullMonth = sy === ey && sm === em && sd === 1 && ed === lastDayOfMonth(ey, em);

  if (fullMonth) {
    return `${smon}-${sy}`;
  }

  if (sy === ey && sm === em) {
    return `${smon}-${sd}-to-${ed}-${sy}`;
  }

  const fromIso = from.slice(0, 10);
  const toIso = to.slice(0, 10);
  return `${fromIso}_to_${toIso}`;
}

export type BuildExportFilenameInput = {
  workspaceSlug: string;
  from: string;
  to: string;
  ext: string;
  /** e.g. time-entries, payroll-timesheets */
  reportSlug?: string;
  purposeSlug?: string;
  scopeHint?: string;
  /** When set, inserts e.g. `-my-timesheet` before report slug */
  scope?: "admin" | "member";
};

/**
 * Builds a filesystem-safe download name, e.g.
 * `kloqra-acme-payroll-timesheets-jun-1-to-18-2026.xlsx`
 */
export function buildExportFilename(input: BuildExportFilenameInput): string {
  const ws = sanitizeFilenameSegment(input.workspaceSlug, 32);
  const dateRange = formatExportDateRange(input.from, input.to);
  const purpose = sanitizeFilenameSegment(
    input.purposeSlug ??
      (input.scope === "member" ? "my-timesheet" : undefined) ??
      input.reportSlug ??
      "export",
    32
  );
  const hint = input.scopeHint ? sanitizeFilenameSegment(input.scopeHint, 24) : "";

  const parts = [BRAND_SLUG, ws, purpose];
  if (hint) parts.push(hint);
  parts.push(dateRange);

  const ext = input.ext.replace(/^\./, "").toLowerCase();
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "bin";
  const base = parts.filter(Boolean).join("-").slice(0, 180);
  return `${base}.${safeExt}`;
}

const REPORT_SLUGS: Partial<Record<ExportReportType, string>> = {
  time_entries: "time-entries",
  daily_summary: "daily-summary",
  weekly_summary: "weekly-summary",
  by_member: "by-member",
  by_project: "by-project",
  by_client: "by-client",
  member_daily_total: "member-daily-total",
  member_project_breakdown: "member-project-breakdown",
  missing_days: "missing-days",
  overtime_summary: "overtime-summary",
  utilization: "utilization",
  users_without_time: "users-without-time",
  timesheet_approval_status: "timesheet-approvals"
};

const LAYOUT_SLUGS: Partial<Record<ExportSheetLayout, string>> = {
  tabs_per_member: "timesheets-by-person",
  tabs_per_project: "by-project",
  tabs_per_client: "by-client",
  tabs_per_category: "by-category"
};

/** Derive a purpose slug when exportPurpose is not set on the body. */
export function deriveExportPurpose(
  body: Pick<ExportBodyDto, "reportTypes" | "sheetLayout" | "exportPurpose">
): string {
  if (body.exportPurpose?.trim()) {
    return sanitizeFilenameSegment(body.exportPurpose.trim(), 48);
  }
  const layoutSlug = LAYOUT_SLUGS[body.sheetLayout ?? "standard"];
  if (layoutSlug && body.sheetLayout !== "standard") return layoutSlug;
  const types = body.reportTypes ?? [];
  if (types.length === 1) {
    return REPORT_SLUGS[types[0]!] ?? sanitizeFilenameSegment(types[0]!, 32);
  }
  if (types.length === 2) {
    const a = REPORT_SLUGS[types[0]!] ?? types[0]!;
    const b = REPORT_SLUGS[types[1]!] ?? types[1]!;
    return sanitizeFilenameSegment(`${a}-and-${b}`, 48);
  }
  if (types.length > 2) {
    return sanitizeFilenameSegment(`${REPORT_SLUGS[types[0]!] ?? types[0]}-and-more`, 48);
  }
  return "export";
}

export type ExportScopeHintInput = {
  projectIds?: string[];
  userIds?: string[];
  projectNames?: string[];
  userNames?: string[];
};

export function buildExportScopeHint(input: ExportScopeHintInput): string | undefined {
  const projectIds = input.projectIds ?? [];
  const userIds = input.userIds ?? [];
  if (projectIds.length === 1 && input.projectNames?.[0]) {
    return sanitizeFilenameSegment(input.projectNames[0], 24);
  }
  if (projectIds.length > 1 && projectIds.length <= 5) {
    return `${projectIds.length}-projects`;
  }
  if (userIds.length === 1 && input.userNames?.[0]) {
    return sanitizeFilenameSegment(input.userNames[0], 24);
  }
  if (userIds.length > 1 && userIds.length <= 5) {
    return `${userIds.length}-people`;
  }
  return undefined;
}

/** RFC 5987-friendly Content-Disposition for binary downloads. */
export function formatContentDisposition(filename: string): string {
  const safe = filename.replace(/[\r\n"]/g, "").replace(/[^\x20-\x7E]/g, "_");
  const encoded = encodeURIComponent(filename);
  if (safe === filename) {
    return `attachment; filename="${safe}"`;
  }
  return `attachment; filename="${safe}"; filename*=UTF-8''${encoded}`;
}

export function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const utf8 = header.match(/filename\*=UTF-8''([^;\s]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return null;
    }
  }
  const quoted = header.match(/filename="([^"]+)"/i);
  if (quoted?.[1]) return quoted[1];
  const bare = header.match(/filename=([^;\s]+)/i);
  return bare?.[1]?.replace(/^["']|["']$/g, "") ?? null;
}
