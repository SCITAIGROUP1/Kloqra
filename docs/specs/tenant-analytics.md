# Tenant analytics (rollup)

Read-only organization-wide utilization for **tenant owners** across all workspaces in the tenant.

## API

| Method | Route                                                                     | Access              |
| ------ | ------------------------------------------------------------------------- | ------------------- |
| GET    | `ROUTES.TENANTS.ANALYTICS_SUMMARY` (`/tenants/current/analytics/summary`) | Tenant `OWNER` only |

### Query parameters

| Param  | Type                          | Notes                      |
| ------ | ----------------------------- | -------------------------- |
| `from` | ISO 8601 datetime with offset | Start of range (inclusive) |
| `to`   | ISO 8601 datetime with offset | End of range (inclusive)   |

Maximum range: **366 days** (`MAX_REPORT_RANGE_DAYS`).

### Response (`TenantAnalyticsSummaryDto`)

- `period` — echoed `from` / `to`
- `totals` — `totalHours`, `billableHours`, `billableAmount`, `billablePercent`, `activeMembers`, `activeWorkspaces`, `currency`, optional `mixedCurrency`
- `byWorkspace[]` — per-workspace rows with the same hour/amount metrics plus `workspaceName`

Totals match the sum of `byWorkspace` rows for hours. Billable rates use the same per-workspace precedence as the workspace dashboard (`TimeAggregationService.resolveRateMaps`).

### Cache

Redis key: `report:tenant-rollup:{tenantId}:{from}:{to}` — TTL **120 seconds** (same as workspace dashboard cache).

Invalidation: workspace timelog writes invalidate workspace report keys; tenant rollup keys expire by TTL in v1.

## UI

- **Admin app** → Account → Overview (`/account`)
- Period presets: 7 / 30 / 90 days + custom date range (default 30 days)
- Stat cards: total hours, billable amount, active members, active workspaces
- Table: hours by workspace (read-only)

Requires `X-Workspace-Id` (any workspace the owner belongs to).

## Contracts

- [tenant-analytics.dto.ts](../../packages/contracts/src/dto/tenant-analytics.dto.ts)

## Tests

- Unit: `apps/api/src/modules/tenants/application/tenant-analytics.service.spec.ts`
- E2E: `apps/api/test/tenant-analytics.e2e.ts`
- Hook: `packages/web-shared/src/features/tenant/use-tenant-analytics-summary.spec.ts`
- Playwright: `apps/admin/e2e/account-rollup.spec.ts`

## Out of scope (v1)

- Cross-workspace CSV/PDF export
- Tenant `ADMIN` access to rollup
- Superadmin customer time aggregates
- Materialized views / nightly rollups
