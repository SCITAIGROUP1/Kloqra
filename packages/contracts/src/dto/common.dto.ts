import { z, type RefinementCtx } from "zod";

export const uuidSchema = z.string().uuid();
export const queryUuidArraySchema = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  if (typeof val === "string")
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  if (Array.isArray(val)) return val;
  return [val];
}, z.array(uuidSchema).optional());
export const isoDatetimeSchema = z.string().datetime({ offset: true });
export const emailSchema = z.string().email();
export const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const workspaceRoleSchema = z.enum(["ADMIN", "MEMBER"]);

/** ISO 4217 three-letter currency code (e.g. USD, EUR). */
export const currencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO 4217 code");

export const DEFAULT_CURRENCY = "USD" as const;
export const timelogSourceSchema = z.enum(["manual", "timer"]);

/** Maximum inclusive span for report/export/billing date ranges */
export const MAX_REPORT_RANGE_DAYS = 366;

export function assertMaxDateRange(from: string, to: string, ctx: RefinementCtx) {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return;
  if (end < start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "to must be >= from",
      path: ["to"]
    });
    return;
  }
  const days = (end - start) / (1000 * 60 * 60 * 24);
  if (days > MAX_REPORT_RANGE_DAYS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Date range must not exceed ${MAX_REPORT_RANGE_DAYS} days`,
      path: ["to"]
    });
  }
}

export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
export type TimelogSource = z.infer<typeof timelogSourceSchema>;
