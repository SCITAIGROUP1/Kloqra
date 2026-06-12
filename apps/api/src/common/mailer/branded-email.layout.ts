import { BRAND_COLORS, BRAND_NAME } from "@kloqra/contracts";

export type BrandedEmailVariant = "success" | "attention" | "warning" | "info";

export type BrandedEmailInput = {
  title: string;
  body: string;
  preheader: string;
  ctaHref?: string;
  ctaLabel?: string;
  variant?: BrandedEmailVariant;
  details?: { label: string; value: string }[];
  footer?: string;
};

const VARIANT_STYLES: Record<BrandedEmailVariant, { pill: string; accent: string }> = {
  success: { pill: "Welcome", accent: BRAND_COLORS.mint },
  attention: { pill: "Action needed", accent: BRAND_COLORS.amber },
  warning: { pill: "Important", accent: BRAND_COLORS.alertRed },
  info: { pill: "Account", accent: BRAND_COLORS.primary }
};

export function subjectPrefix(text: string): string {
  return `[${BRAND_NAME}] ${text}`;
}

export function renderBrandedEmailHtml(input: BrandedEmailInput): string {
  const variant = input.variant;
  const style = variant ? VARIANT_STYLES[variant] : null;
  const paragraphs = input.body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${BRAND_COLORS.body};">${escapeHtml(p)}</p>`
    )
    .join("");

  const detailsRows = (input.details ?? [])
    .map(
      (row) => `
        <tr>
          <td style="padding:8px 12px;color:${BRAND_COLORS.muted};font-size:13px;width:120px;vertical-align:top;">${escapeHtml(row.label)}</td>
          <td style="padding:8px 12px;color:${BRAND_COLORS.dark};font-size:13px;vertical-align:top;">${escapeHtml(row.value)}</td>
        </tr>`
    )
    .join("");

  const detailsTable =
    detailsRows.length > 0
      ? `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 0;border-collapse:collapse;background:${BRAND_COLORS.surface};border:1px solid ${BRAND_COLORS.border};border-radius:8px;overflow:hidden;">
          ${detailsRows}
        </table>`
      : "";

  const variantPill = style
    ? `
          <tr>
            <td style="padding:0 28px 8px;">
              <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${style.accent}22;color:${style.accent};font-size:11px;font-weight:600;letter-spacing:0.02em;">${style.pill}</span>
            </td>
          </tr>`
    : "";

  const ctaRow =
    input.ctaHref && input.ctaLabel
      ? `
          <tr>
            <td style="padding:28px 28px 32px;">
              <a href="${escapeHtml(input.ctaHref)}" style="display:inline-block;padding:12px 20px;background:${BRAND_COLORS.primary};color:${BRAND_COLORS.white};text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">${escapeHtml(input.ctaLabel)}</a>
            </td>
          </tr>`
      : `
          <tr>
            <td style="padding:8px 28px 32px;"></td>
          </tr>`;

  const footer = input.footer?.trim();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND_COLORS.surface};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND_COLORS.surface};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${BRAND_COLORS.white};border:1px solid ${BRAND_COLORS.border};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px 8px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:${BRAND_COLORS.navy};">${BRAND_NAME}</p>
              <p style="margin:4px 0 0;font-size:12px;color:${BRAND_COLORS.muted};">Track time. Unlock productivity.</p>
            </td>
          </tr>
          ${variantPill}
          <tr>
            <td style="padding:8px 28px 0;">
              <h1 style="margin:0;font-size:22px;line-height:1.3;color:${BRAND_COLORS.dark};">${escapeHtml(input.title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 0;">
              ${paragraphs}
              ${detailsTable}
            </td>
          </tr>
          ${ctaRow}
          ${
            footer
              ? `
          <tr>
            <td style="padding:0 28px 24px;border-top:1px solid ${BRAND_COLORS.border};">
              <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:${BRAND_COLORS.muted};">${escapeHtml(footer)}</p>
            </td>
          </tr>`
              : ""
          }
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function renderBrandedEmailText(input: BrandedEmailInput): string {
  const lines = [input.title, "", input.body];
  for (const row of input.details ?? []) {
    lines.push(`${row.label}: ${row.value}`);
  }
  if (input.ctaHref && input.ctaLabel) {
    lines.push("", `${input.ctaLabel}: ${input.ctaHref}`);
  }
  if (input.footer) {
    lines.push("", input.footer);
  }
  return lines.join("\n");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
