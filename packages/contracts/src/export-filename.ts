import { BRAND_NAME } from "./brand.js";

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

function formatDatePart(iso: string): string {
  const d = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "unknown-date";
}

export type BuildExportFilenameInput = {
  workspaceSlug: string;
  from: string;
  to: string;
  ext: string;
  /** e.g. time-entries, daily-summary */
  reportSlug?: string;
  /** When set, inserts e.g. `-my-timesheet` before report slug */
  scope?: "admin" | "member";
};

/**
 * Builds a filesystem-safe download name, e.g.
 * `kloqra-demo-workspace-2025-05-01_to_2025-05-31-time-entries.csv`
 */
export function buildExportFilename(input: BuildExportFilenameInput): string {
  const ws = sanitizeFilenameSegment(input.workspaceSlug, 40);
  const from = formatDatePart(input.from);
  const to = formatDatePart(input.to);
  const scope = input.scope === "member" ? "-my-timesheet" : "";
  const report = input.reportSlug ? `-${sanitizeFilenameSegment(input.reportSlug, 32)}` : "";
  const ext = input.ext.replace(/^\./, "").toLowerCase();
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "bin";
  return `${BRAND_SLUG}-${ws}-${from}_to_${to}${scope}${report}.${safeExt}`;
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
