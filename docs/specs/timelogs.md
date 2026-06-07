# Time logs spec

## User-visible outcome

- **Members** create, edit, and delete their own manual time entries on assigned projects.
- **Admins** can list and filter all members’ logs and edit/delete any entry in the workspace.
- **Audit trail** records create, update, and delete on every entry (all projects).
- **Optional per-project approval** locks entries when a period is submitted or approved.

## API

| Method | Route                        | Contract                                                                      |
| ------ | ---------------------------- | ----------------------------------------------------------------------------- |
| GET    | `/timelogs`                  | [timelog.dto.ts](../../packages/contracts/src/dto/timelog.dto.ts)             |
| POST   | `/timelogs`                  | timelog.dto                                                                   |
| PATCH  | `/timelogs/:id`              | timelog.dto                                                                   |
| DELETE | `/timelogs/:id`              | timelog.dto                                                                   |
| GET    | `/timelogs/:id/audit-events` | [timelog-audit.dto.ts](../../packages/contracts/src/dto/timelog-audit.dto.ts) |

| Method | Route                                 | Contract                                                              |
| ------ | ------------------------------------- | --------------------------------------------------------------------- |
| GET    | `/timesheets/status?projectId=&date=` | [timesheet.dto.ts](../../packages/contracts/src/dto/timesheet.dto.ts) |
| GET    | `/timesheets/submissions?date=`       | timesheet.dto                                                         |
| POST   | `/timesheets/submit`                  | timesheet.dto                                                         |
| GET    | `/timesheets/pending`                 | timesheet.dto (admin)                                                 |

Controller: [timelogs.controller.ts](../../apps/api/src/modules/timelogs/interface/http/timelogs.controller.ts)

## Given / When / Then

### List

**Given** an authenticated user in a workspace  
**When** they GET `/timelogs` with optional `from`, `to`, `taskId`, `userId`  
**Then**

- **MEMBER:** only their logs are returned (`userId` filter ignored).
- **ADMIN:** all workspace logs; optional `userId` filter applies.

### Create manual entry

**Given** a task in a project the user can access  
**When** they POST `/timelogs` with `startTime`, `endTime`, optional `description`, `isBillable`  
**Then** a log is created with `source: manual` and `durationSec` computed from the interval; an audit `CREATE` event is stored.

### Overlap protection

**When** start/end overlaps another log for the same user  
**Then** the API returns a validation/conflict error.

### Update / delete

**When** a member PATCHes or DELETEs a log they do not own  
**Then** `403 FORBIDDEN`.

**When** updating times  
**Then** overlap rules apply again.

**When** PATCH on `source: timer`  
**Then** `403 TIMELOG_NOT_EDITABLE`.

### Per-project approval locks

**Given** a project with `timesheetApprovalEnabled: true`  
**When** the member’s period for that project is `SUBMITTED` or `APPROVED`  
**Then** create/update/delete on entries in that project and period returns `TIMELOG_NOT_EDITABLE`.

**When** an admin rejects the period  
**Then** entries become editable again.

**Given** a project with approval disabled  
**Then** entries are never locked by the approval workflow (audit still applies).

### Timer-sourced entries

Entries created via `POST /timer/stop` have `source: timer`. Timer entries cannot be PATCHed; DELETE is allowed when the period is editable.

## UI

- Client: [apps/client/src/features/timesheet/timesheet-page.tsx](../../apps/client/src/features/timesheet/timesheet-page.tsx)
- Admin project approval settings: [apps/admin/src/features/projects/projects-page.tsx](../../apps/admin/src/features/projects/projects-page.tsx)

## Edge cases

- Task must belong to a project in the active workspace.
- Date range filters use interval overlap (`startTime` / `endTime`).
- Moving an entry between projects validates lock status on both source and target when approval is enabled.
