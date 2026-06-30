# Reporting spec

## User-visible outcome

- **Admins** view workspace dashboard aggregates (hours by project, by user, by category, trends) for a date range.
- **Members** view personal summary via `/reporting/me` (where exposed in client), including `byCategory` week rollup.

## API

| Method | Route                            | Roles         | Contract                                                                    |
| ------ | -------------------------------- | ------------- | --------------------------------------------------------------------------- |
| GET    | `/reporting/dashboard`           | ADMIN         | [reporting.dto.ts](../../packages/contracts/src/dto/reporting.dto.ts)       |
| GET    | `/reporting/me`                  | ADMIN, MEMBER | reporting.dto                                                               |
| GET    | `/reporting/categories-heatmap`  | ADMIN         | reporting.dto                                                               |
| POST   | `/reporting/widget-shares`       | ADMIN         | [widget-share.dto.ts](../../packages/contracts/src/dto/widget-share.dto.ts) |
| GET    | `/reporting/widget-share/:token` | public        | widget-share.dto                                                            |

Controller: [reporting.controller.ts](../../apps/api/src/modules/reporting/interface/http/reporting.controller.ts), [widget-share.controller.ts](../../apps/api/src/modules/reporting/interface/http/widget-share.controller.ts)

Query parameters: `from`, `to` (ISO datetimes), optional `projectId`, `userId`, `categoryId`. Member `/reporting/me` accepts optional `categoryId` only.

## Behavior

- Aggregates **time logs** in the workspace for the period.
- Billable amounts use the same rate resolution as [billing.md](./billing.md).
- Shared aggregation logic with export: [time-aggregation.service.ts](../../apps/api/src/modules/reporting/application/time-aggregation.service.ts)

## Given / When / Then

**When** ADMIN GETs `/reporting/dashboard` with a valid range  
**Then** response includes workspace-level totals, `timeByCategory`, and breakdowns used by the admin dashboard charts.

**When** user GETs `/reporting/me`  
**Then** only that user’s logs in the workspace are included.

## Widget public sharing

**When** ADMIN POSTs `/reporting/widget-shares` with `widgetId`, date range, optional scope filters, and widget options  
**Then** a tokenized share URL is returned (`{PUBLIC_ADMIN_URL}/widget/{token}`).

**When** anyone GETs `/reporting/widget-share/:token` with a valid, unexpired token  
**Then** the API returns workspace name, widget metadata, and a fresh `DashboardReportDto` payload for read-only rendering.

**When** the token is missing or expired  
**Then** the API returns 404.

Expired `WidgetShare` rows are purged on the same daily interval as `ReportShare`.

## UI

- Admin: [apps/admin/src/app/(admin)/dashboard/page.tsx](<../../apps/admin/src/app/(admin)/dashboard/page.tsx>)
- Public widget share: [apps/admin/src/app/widget/[token]/page.tsx](../../apps/admin/src/app/widget/[token]/page.tsx)
- Client timesheet may use `/reporting/me` for “My week summary”.

## Edge cases

- Empty range returns zero totals, not an error.
- Export totals for the same filters should match dashboard aggregates (see export tests).
