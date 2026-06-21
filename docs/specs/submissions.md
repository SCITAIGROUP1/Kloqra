# Timesheet submissions spec

Technical reference for the per-project approval workflow. End-user steps: [Timesheet submissions and approval](../user-guides/timesheet-submissions-and-approval.md). Time-log lock rules: [timelogs.md](./timelogs.md).

## User-visible outcome

- **Members** submit periods per project, track status on `/submissions`, and request amendments on locked periods.
- **Admins** review on `/approvals`, send reminders for missing submissions, and approve/deny amendment requests.

## Period statuses

| Status      | Meaning                                      |
| ----------- | -------------------------------------------- |
| `DRAFT`     | Logged hours; not yet submitted              |
| `SUBMITTED` | Awaiting admin review; entries locked        |
| `APPROVED`  | Signed off; entries locked                   |
| `REJECTED`  | Sent back; member may edit and resubmit      |
| `WAIVED`    | Cleared from actionable list (policy change) |

## API

Controller: [timesheets.controller.ts](../../apps/api/src/modules/timelogs/interface/http/timesheets.controller.ts)

| Method | Route                                | Roles  | Purpose                                      |
| ------ | ------------------------------------ | ------ | -------------------------------------------- |
| GET    | `/timesheets/status`                 | Member | Status for one project + date                |
| GET    | `/timesheets/submissions`            | Member | Member submission list (`scope`, lookback)   |
| GET    | `/timesheets/submit-preview`         | Member | Preview target period + cascade blocked info |
| POST   | `/timesheets/submit`                 | Member | Submit one period (optional cascade confirm) |
| POST   | `/timesheets/:periodId/amendments`   | Member | Request edit on locked period                |
| GET    | `/timesheets/pending`                | Admin  | Pending review queue                         |
| GET    | `/timesheets/approved`               | Admin  | Approved history                             |
| GET    | `/timesheets/rejected`               | Admin  | Rejected history                             |
| GET    | `/timesheets/missing`                | Admin  | Members with hours but no submission         |
| POST   | `/timesheets/remind`                 | Admin  | Send missing-submission reminder             |
| GET    | `/timesheets/amendments/pending`     | Admin  | Pending amendment requests                   |
| PATCH  | `/timesheets/amendments/:id/approve` | Admin  | Allow edit → period returns to `DRAFT`       |
| PATCH  | `/timesheets/amendments/:id/deny`    | Admin  | Deny amendment                               |
| PATCH  | `/timesheets/:id/approve`            | Admin  | Approve submitted period                     |
| PATCH  | `/timesheets/:id/reject`             | Admin  | Reject (review note required)                |

DTOs: [timesheet.dto.ts](../../packages/contracts/src/dto/timesheet.dto.ts)

## Domain rules

1. Approval is **per project** (`timesheetApprovalEnabled` on project or workspace default).
2. Period boundaries follow workspace timezone and **week starts on** setting.
3. **Hours-only drafts:** submission lists include draft rows only when the member has logged hours in that period (virtual + DB rows).
4. **No backlog on policy change:** enabling/disabling approval or changing period type waives open `DRAFT` and `REJECTED` periods on that project.
5. **Ordered submit:** a rejected earlier period must be resubmitted before later periods on the same project.
6. **Reject requires review note** (`reviewNote` in `rejectTimesheetSchema`).
7. Notifications fire on submit, approve, reject, and approval-settings change — see [notifications-realtime.md](./notifications-realtime.md).

## Realtime invalidation scopes

| Event                     | Scopes invalidated                              |
| ------------------------- | ----------------------------------------------- |
| Submit / approve / reject | `submissions`, `timesheet`, `pending_approvals` |
| Approval settings change  | `submissions`, `projects`                       |

## UI

| App    | Route          | Feature folder                                                                       |
| ------ | -------------- | ------------------------------------------------------------------------------------ |
| Client | `/submissions` | [apps/client/src/features/submissions/](../../apps/client/src/features/submissions/) |
| Admin  | `/approvals`   | [apps/admin/src/features/approvals/](../../apps/admin/src/features/approvals/)       |

## Given / When / Then

**Given** a project with approval enabled and logged hours in the current week  
**When** a member POSTs `/timesheets/submit`  
**Then** the period becomes `SUBMITTED`, entries lock, and admins receive a notification.

**Given** a prior rejected period on the same project  
**When** a member tries to submit a later period  
**Then** submit-preview returns `blockedReason` until the earlier period is fixed.

**When** an admin PATCHes `/timesheets/:id/reject` without `reviewNote`  
**Then** `400 VALIDATION_ERROR`.

## Edge cases

- Remind is rate-limited per member/project (~once per day).
- Approve/reject notifications include total hours and review notes where applicable.
- Member `GET /timesheets/submissions` supports `scope: logged | assigned` and `lookbackWeeks` (default 26).
