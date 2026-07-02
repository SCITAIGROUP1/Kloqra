import { z } from "zod";
import {
  assertMaxDateRange,
  currencyCodeSchema,
  isoDatetimeSchema,
  uuidSchema
} from "./common.dto";

export const tenantAnalyticsQuerySchema = z
  .object({
    from: isoDatetimeSchema,
    to: isoDatetimeSchema
  })
  .superRefine((v, ctx) => assertMaxDateRange(v.from, v.to, ctx));

export const tenantAnalyticsWorkspaceRowSchema = z.object({
  workspaceId: uuidSchema,
  workspaceName: z.string(),
  totalHours: z.number(),
  billableHours: z.number(),
  billableAmount: z.number(),
  billablePercent: z.number(),
  activeMembers: z.number().int().nonnegative(),
  currency: currencyCodeSchema.optional()
});

export const tenantAnalyticsTotalsSchema = z.object({
  totalHours: z.number(),
  billableHours: z.number(),
  billableAmount: z.number(),
  billablePercent: z.number(),
  activeMembers: z.number().int().nonnegative(),
  activeWorkspaces: z.number().int().nonnegative(),
  currency: currencyCodeSchema,
  mixedCurrency: z.boolean().optional()
});

export const tenantAnalyticsSummarySchema = z.object({
  period: z.object({
    from: isoDatetimeSchema,
    to: isoDatetimeSchema
  }),
  totals: tenantAnalyticsTotalsSchema,
  byWorkspace: z.array(tenantAnalyticsWorkspaceRowSchema)
});

export type TenantAnalyticsQueryDto = z.infer<typeof tenantAnalyticsQuerySchema>;
export type TenantAnalyticsWorkspaceRowDto = z.infer<typeof tenantAnalyticsWorkspaceRowSchema>;
export type TenantAnalyticsTotalsDto = z.infer<typeof tenantAnalyticsTotalsSchema>;
export type TenantAnalyticsSummaryDto = z.infer<typeof tenantAnalyticsSummarySchema>;
