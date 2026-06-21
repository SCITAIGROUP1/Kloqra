# Time logs spec

## User-visible outcome

- **Members** create, edit, and delete their own manual time entries on assigned projects.
- **Admins** can list and filter all members’ logs and edit/delete any entry in the workspace.
- **Audit trail** records create, update, and delete on every entry (all projects).
- **Optional per-project approval** locks entries when a period is submitted or approved.

## API

| Method | Route                         | Contract                                                                              |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------- |
| GET    | `/timelogs`                   | [timelog.dto.ts](../../packages/contracts/src/dto/timelog.dto.ts)                     |
| GET    | `/timelogs/occupancy`         | [timelog-occupancy.dto.ts](../../packages/contracts/src/dto/timelog-occupancy.dto.ts) |
| GET    | `/timelogs/yesterday-summary` | timelog.dto (member)                                                                  |
| GET    | `/timelogs/audit`             | [timelog-audit.dto.ts](../../packages/contracts/src/dto/timelog-audit.dto.ts) (admin) |
| GET    | `/timelogs/:id/audit-events`  | timelog-audit.dto                                                                     |
| POST   | `/timelogs`                   | timelog.dto                                                                           |
| POST   | `/timelogs/batch`             | timelog.dto (recurring entries)                                                       |
| PATCH  | `/timelogs/:id`               | timelog.dto                                                                           |
| DELETE | `/timelogs/:id`               | timelog.dto                                                                           |

Timesheet routes are documented in [submissions.md](./submissions.md). Controller: [timelogs.controller.ts](../../apps/api/src/modules/timelogs/interface/http/timelogs.controller.ts), [timesheets.controller.ts](../../apps/api/src/modules/timelogs/interface/http/timesheets.controller.ts).

## Given / When / Then

### List

**Given** an authenticated user in a workspace  
**When** they GET `/timelogs` with optional `from`, `to`, `taskId`, `userId`  
**Then**

- **MEMBER:** only their logs are returned (`userId` filter ignored).
- **ADMIN:** all workspace logs; optional `userId` filter applies.

### Occupancy (member calendar)

**Given** an authenticated **MEMBER**  
**When** they GET `/timelogs/occupancy` with required `from` and `to`  
**Then** their time logs in that interval are returned for **workspaces they belong to** only (same list as the workspace switcher). Logs in projects/workspaces they cannot access are excluded.

**When** checking overlap on create/update  
**Then** only entries in accessible workspaces count toward the one-timeline rule.

**When** an **ADMIN** calls the same route  
**Then** `403 FORBIDDEN` (client calendar uses workspace-scoped list for admins).

### Create manual entry

**Given** a task in a project the user can access  
**When** they POST `/timelogs` with `startTime`, `endTime`, optional `description`, `isBillable`, optional `date` override  
**Then** a log is created with `source: manual` and `durationSec` computed from the interval; an audit `CREATE` event is stored.

### Recurring batch create

**When** they POST `/timelogs/batch` with `recurrence` (`daily` | `weekdays` | `weekly`), `startDate`, `endDate`, and time-of-day fields  
**Then** the API expands dates in range (skipping weekends for `weekdays`), creates non-overlapping entries, and returns `{ created, skipped }`. End date cannot extend into the future.

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
**Then** create/update/delete on entries in that project and period returns `TIMELOG_NOT_EDITABLE` for **all roles** (including admins).

**When** a member submits a period  
**Then** only that period is marked `SUBMITTED` (no automatic batch submit of earlier drafts).

**When** an admin enables approval, disables approval, or changes the approval period  
**Then** open `DRAFT` and `REJECTED` periods on that project are marked `WAIVED`; members only see actionable periods from the policy effective date with logged hours.

**When** an admin rejects the period  
**Then** entries become editable again.

**When** a member requests an amendment on a locked period and an admin approves it  
**Then** the period returns to `DRAFT` and entries become editable until resubmitted.

**Given** a project with approval disabled  
**Then** entries are never locked by the approval workflow (audit still applies).

### Timer-sourced entries

Entries created via `POST /timer/stop` have `source: timer`. Timer entries cannot be PATCHed; DELETE is allowed when the period is editable.

## UI

- Client: [timesheet-page.tsx](../../apps/client/src/features/timesheet/timesheet-page.tsx), [time-tracker-page.tsx](../../apps/client/src/features/time-tracker/time-tracker-page.tsx)
- Client submissions: [submissions-page.tsx](../../apps/client/src/features/submissions/submissions-page.tsx) — see [submissions.md](./submissions.md)
- Admin project approval settings: [projects-page.tsx](../../apps/admin/src/features/projects/projects-page.tsx)

## Edge cases

- Task must belong to a project in the active workspace.
- Date range filters use interval overlap (`startTime` / `endTime`).
- **Deletion preservation:** deleting a project, task, or category re-associates logged hours to an **Uncategorized** fallback project/task so history is never lost.
- **Partitioning:** `time_logs` and audit events use PostgreSQL range partitions — see [DATABASE_PARTITIONING.md](../architecture/DATABASE_PARTITIONING.md).
- Moving an entry between projects validates lock status on both source and target when approval is enabled.
