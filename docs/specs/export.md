# Export spec

## User-visible outcome

- **Admins** run a multi-report export wizard: filters, report types, per-report columns, CSV / Excel / PDF, row preview, presets (local + server), scheduled exports, shareable links.
- **Admins** quick-export from the dashboard (same date range as analytics chips).
- **Members** export their own timesheet from the client app (`POST /export/me`).
- **Public** read-only report views via share token (`GET /export/share/:token`).

Exports query **TimeLog** rows in the active workspace (not `TeamMember` directly). “Team member” in filters means **filter by user**, optionally limited to a project’s team.

Domain note: [DOMAIN_MODEL.md](../architecture/DOMAIN_MODEL.md).

## API

| Method | Route                       | Roles         | Contract                                                  |
| ------ | --------------------------- | ------------- | --------------------------------------------------------- |
| POST   | `/export`                   | ADMIN         | `exportBodySchema`                                        |
| POST   | `/export/preview`           | ADMIN         | `exportPreviewBodySchema` → `exportPreviewResponseSchema` |
| GET    | `/export`                   | ADMIN         | `exportQuerySchema` (legacy; default columns)             |
| POST   | `/export/me`                | ADMIN, MEMBER | `memberExportBodySchema`                                  |
| GET    | `/export/presets`           | ADMIN         | —                                                         |
| POST   | `/export/presets`           | ADMIN         | `createExportPresetSchema`                                |
| DELETE | `/export/presets/:id`       | ADMIN         | —                                                         |
| GET    | `/export/schedules`         | ADMIN         | —                                                         |
| POST   | `/export/schedules`         | ADMIN         | `createExportScheduleSchema`                              |
| PATCH  | `/export/schedules/:id`     | ADMIN         | `updateExportScheduleSchema`                              |
| DELETE | `/export/schedules/:id`     | ADMIN         | —                                                         |
| POST   | `/export/shares`            | ADMIN         | `createReportShareSchema`                                 |
| GET    | `/export/share/:token`      | Public        | `publicReportShareViewSchema`                             |
| POST   | `/export/jobs`              | ADMIN         | `createExportJobSchema` → `exportJobDtoSchema`            |
| GET    | `/export/jobs`              | ADMIN         | — (recent jobs, default 20)                               |
| GET    | `/export/jobs/:id`          | ADMIN         | `exportJobDtoSchema`                                      |
| GET    | `/export/jobs/:id/download` | ADMIN         | Binary attachment when `status=ready`                     |

Controller: [export.controller.ts](../../apps/api/src/modules/export/interface/http/export.controller.ts), [export-share.controller.ts](../../apps/api/src/modules/export/interface/http/export-share.controller.ts)

Aggregation: [export.service.ts](../../apps/api/src/modules/export/application/export.service.ts), [export-rows.builder.ts](../../apps/api/src/modules/export/application/export-rows.builder.ts), [time-aggregation.service.ts](../../apps/api/src/modules/reporting/application/time-aggregation.service.ts)

Filenames: [export-filename.ts](../../packages/contracts/src/export-filename.ts)

## Report catalog (admin)

| Type                        | Description                                   |
| --------------------------- | --------------------------------------------- |
| `time_entries`              | One row per logged interval                   |
| `invoice`                   | Billable entries only + TOTAL row             |
| `daily_summary`             | date × member × project                       |
| `weekly_summary`            | ISO week × member × project                   |
| `by_project`                | One row per project                           |
| `by_member`                 | One row per user with logs                    |
| `by_client`                 | One row per client (from project metadata)    |
| `by_task`                   | One row per task                              |
| `by_category`               | One row per category × project                |
| `users_without_time`        | Members with zero logs in range               |
| `budget_vs_actual`          | Project budget vs logged hours                |
| `utilization`               | Member × week vs expected hours (default 40h) |
| `member_daily_total`        | date × member (all projects combined)         |
| `member_project_breakdown`  | member × project hours                        |
| `missing_days`              | Weekdays in range with no logs per member     |
| `overtime_summary`          | Weekly logged vs expected with over/under     |
| `hours_by_source`           | Timer vs manual hours per member              |
| `timesheet_approval_status` | TimesheetPeriod rows in range                 |

Column keys and labels: SSOT in `export.dto.ts`.

## Member export reports

Subset: `time_entries`, `daily_summary`, `by_project`, `by_category` — columns exclude workspace-wide fields.

## Filters

| Filter    | Behavior                                  |
| --------- | ----------------------------------------- |
| Period    | `from` + `to` (ISO datetimes)             |
| Project   | Optional `projectId` or `projectIds[]`    |
| Member    | Optional `userId` or `userIds[]` (admin)  |
| Category  | Optional `categoryId`                     |
| Team only | Optional `teamOnly` when project selected |
| Billable  | `all` \| `billable` \| `non_billable`     |

## Group by (admin)

`groupBy` on `exportBodySchema` / `exportPreviewBodySchema` is an **ordered array** of dimensions (`project`, `member`, `task`, `category`, `client`, `day`, `week`), max 5. Empty array = manual report selection. Legacy presets with a single string (e.g. `"project"`) are normalized on parse.

- **Admin UI:** Multi-select dimensions; **sort order** list with ↑↓ controls. Combining e.g. Client → Project sorts detail rows that way and includes both `by_client` and `by_project` sheets (plus `time_entries`, and `daily_summary` / `weekly_summary` when day/week are selected).
- **API:** `sortRowsForGroupBy` applies each dimension’s sort keys in order, then date/time tie-breakers on detail sheets.
- **Suggested sheets** (`reportsForGroupBy`): union of rollups for each selected dimension, always including `time_entries` when any dimension is active.

## Sheet layout (admin)

`sheetLayout`: `standard` \| `tabs_per_member` \| `tabs_per_project` \| `tabs_per_client` \| `tabs_per_category` (default `standard`).

- **standard:** One tab per report type (current default).
- **tabs_per_member / project / client:** Splits `time_entries`, `daily_summary`, `weekly_summary`, and `invoice` into one tab per distinct member, project, or client. Summary report types (`by_member`, etc.) stay as single tabs.
- **Preview:** `POST /export/preview` returns `headline`, `detail`, `sheets[]`, optional `sampleRows[]` (up to 5 rows for primary report), `estimatedRowCount`, and `warnLargeExport` when row count exceeds `EXPORT_LARGE_ROW_THRESHOLD` (10,000).

## Workspace settings (export)

Parsed via [workspace-settings.ts](../../packages/contracts/src/workspace-settings.ts):

- `exportFooterNote` — PDF footer text
- `logoUrl` — reserved for future PDF logo embed
- `weekStart` — `monday` \| `sunday` for weekly/utilization buckets
- `expectedWeeklyHours` — utilization denominator (default 40)

## Formats

| Format | Delivery                                  |
| ------ | ----------------------------------------- |
| CSV    | One file per report; multiple → ZIP       |
| Excel  | One workbook, one sheet per report        |
| PDF    | Summary layout; footer note from settings |

## Asynchronous Export Jobs (Queue)

For heavy or long-running exports that could timeout or block the main HTTP thread pool, clients submit an asynchronous job via `POST /export/jobs`.

- **Queue Pipeline**: Creating a job creates an `exportJob` record in the database with the `queued` status and enqueues a task `{ jobId }` onto the **BullMQ** `export-queue` (defined as `QUEUES.EXPORT`).
- **Worker Execution**: A background `ExportWorker` consumes the queue:
  1. Updates status to `running`.
  2. Calls `ExportService.generate(...)` to build the file buffer.
  3. Saves the file to storage via `writeExportJobFile(...)`.
  4. Marks status to `ready` with metadata (filename, contentType, byteSize, storageKey).
  5. Sends a completion email via `MailerService` and dispatches a system notification.
  6. On failure, updates status to `failed` and logs the error message.
- **Retention & Cleanup**: Exported files are retained for 7 days. A daily cron task (`@Cron("0 4 * * *")`) purges expired files and sets status to `expired`.

## Scheduled exports

`ExportSchedule` stores frozen `exportBodySchema` JSON, frequency (`daily` \| `weekly` \| `monthly`), and recipient emails. A background interval runs due schedules and calls `generate()`; delivery is logged (SMTP integration optional via env).

## Shareable links

`ReportShare` stores filter snapshot + token. Public GET returns JSON view (up to 100 rows per report). Expires per `expiresInDays` (max 90).

## Given / When / Then

**When** ADMIN POSTs `/export/preview`  
**Then** JSON with per-report row counts and `isEmpty`.

**When** ADMIN POSTs `/export` with valid body  
**Then** binary attachment with sanitized filename.

**When** GET `/export/share/:token` and not expired  
**Then** public JSON report view without auth.

## UI

- Admin: [exports/page.tsx](<../../apps/admin/src/app/(admin)/exports/page.tsx>), [dashboard/page.tsx](<../../apps/admin/src/app/(admin)/dashboard/page.tsx>)
- Client: timesheet export on client app

## Testing

- [export-week.util.spec.ts](../../apps/api/src/modules/export/application/export-week.util.spec.ts)
- [export-preview.spec.ts](../../apps/api/src/modules/export/application/export-preview.spec.ts)
- Aggregation parity: `time-aggregation.export.spec.ts`

## Out of scope

- Cross-workspace export
- QuickBooks / Xero sync
- Expense / attendance report types
