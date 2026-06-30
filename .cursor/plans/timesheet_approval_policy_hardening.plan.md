---
name: Timesheet approval policy hardening
overview: >-
  Close submission/approval gaps when admins change project settings — no phantom drafts,
  no backlog catch-up, single-period submit, table-only member Submissions UX, and a tenant guide.
todos:
  - id: schema-policy
    content: WAIVED status, approval effective dates, approvalPeriod snapshot on TimesheetPeriod
    status: completed
  - id: api-list-submissions
    content: Server-side lookback scan; hours-only drafts; exclude pre-policy and WAIVED periods
    status: completed
  - id: api-settings-hooks
    content: ProjectsService waives open DRAFT/REJECTED on enable/disable/frequency change
    status: completed
  - id: client-submissions-ux
    content: Table-only Submissions with tabs, date range + project filters, single API fetch
    status: completed
  - id: admin-settings-confirm
    content: Confirm dialog on project approval settings save explaining waiver behavior
    status: completed
  - id: remove-cascade-submit
    content: Single-period submit only; simplify SubmitCascadeDialog
    status: completed
  - id: deep-links
    content: Member submissions tab param; timesheet deep links from submission rows
    status: completed
  - id: seeds-migration
    content: Migration backfill + seed approval effective dates and approvalPeriod on periods
    status: completed
  - id: tenant-guide
    content: docs/user-guides/timesheet-submissions-and-approval.md
    status: completed
  - id: tests
    content: API policy util, timesheets/projects specs, client/admin/UI specs, e2e submissions
    status: completed
isProject: false
---

# Timesheet approval policy hardening

**Shipped in:** `7a71d2a` on `dev`

**Tenant guide:** [`docs/user-guides/timesheet-submissions-and-approval.md`](../../docs/user-guides/timesheet-submissions-and-approval.md)

**Spec:** [`docs/specs/timelogs.md`](../../docs/specs/timelogs.md)

---

## Problem

Before this slice, changing approval settings on a project had **no side effects** on open periods. Members saw many **virtual draft rows** (including weeks with zero hours) when scanning history. **Cascade submit** bundled older drafts into one action. Re-enabling approval resurrected stale backlog.

---

## Product decisions

| Topic | Decision |
| ----- | -------- |
| Submit scope | **One period per submit** — no automatic batch of earlier drafts |
| Draft visibility | Show draft rows only when **logged hours > 0** |
| Settings change | **Waive** open `DRAFT` and `REJECTED` periods; members start fresh from policy effective date |
| Pre-policy periods | Hidden from Submissions; submit rejected if before `timesheetApprovalEnabledAt` |
| Rejected blocker | Must fix/resubmit **earlier rejected** period before submitting later ones (same project) |
| Member UX | **Table-only** Submissions — tabs All / Action needed / Pending / Approved; filters for date range + projects |
| Admin UX | **Confirm dialog** when saving approval toggle or period change |

---

## Schema (`20260621120000_timesheet_approval_policy`)

- `TimesheetStatus.WAIVED` — waived when admin changes policy or disables approval
- `Project.timesheetApprovalEnabledAt` — when approval started for this project
- `Project.timesheetApprovalPeriodEffectiveAt` — when current period cadence took effect
- `TimesheetPeriod.approvalPeriod` — snapshot at submit time

---

## API behavior

### `GET /timesheets/submissions`

- Query: `scope`, `date`, `lookbackWeeks` (default 26)
- Scans periods server-side per approval-enabled project
- Includes DB rows + virtual drafts **with hours only**
- Excludes `WAIVED` and periods entirely before enablement

### `ProjectsService.update`

On approval **enable**, **disable**, or **period change**:

1. Set effective timestamps (`timesheetApprovalEnabledAt` / `timesheetApprovalPeriodEffectiveAt`)
2. `updateMany` open `DRAFT`/`REJECTED` → `WAIVED`

### Submit

- Stores `approvalPeriod` on the period row
- Rejects periods before policy start
- `cascadedCount: 0` always

### Lock service

- `WAIVED` treated as editable (same as draft)

---

## Frontend

| Area | Change |
| ---- | ------ |
| Client Submissions | Single fetch with `lookbackWeeks=26`; removed card grid |
| Submissions filters | Date range picker, SearchableMultiSelect for projects |
| Submissions table | Period, project, status, note, actions; View timesheet deep link |
| Admin project settings | ConfirmDialog before saving approval changes |
| web-shared | `submission-deep-link` tab param; `timesheet-deep-link` helpers |

---

## Removed / simplified

- `submissions-lazy.tsx`, `submission-status-card.tsx`
- Cascade batch submit loop in API and client
- 26 parallel `/timesheets/submissions` client fetches

---

## Follow-ups (not in this slice)

- Admin modal with **counts** of periods to be waived (preview API)
- Monthly-default lookback window tuning for large workspaces
- Update `timesheet_submissions_workflow` notification matrix (remove cascade batch row)

---

## Verification

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
cd apps/api && pnpm prisma migrate deploy && pnpm prisma:seed
```
