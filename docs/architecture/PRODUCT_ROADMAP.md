# Kloqra product roadmap

Product features beyond the core timer/timesheet loop. Shipped features link to specs under `docs/specs/`; export details in [export.md](../specs/export.md).

## Role model (reminder)

| App                        | Audience           | Purpose                                                |
| -------------------------- | ------------------ | ------------------------------------------------------ |
| **Client** (`apps/client`) | Workspace `MEMBER` | Log time on assigned project teams                     |
| **Admin** (`apps/admin`)   | Workspace `ADMIN`  | Operate the org: projects, billing, analytics, exports |

See [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) for workspace vs project team boundaries.

---

## Shipped (baseline)

| Area                                                                    | Client | Admin              | Spec                                                               |
| ----------------------------------------------------------------------- | ------ | ------------------ | ------------------------------------------------------------------ |
| Timer, timesheet, tasks                                                 | Yes    | —                  | [timer.md](../specs/timer.md), [timelogs.md](../specs/timelogs.md) |
| My projects / team invites                                              | Yes    | Projects + invites | [projects.md](../specs/projects.md)                                |
| Auth & workspace                                                        | Yes    | Yes                | [auth-workspace.md](../specs/auth-workspace.md)                    |
| Workspace analytics dashboard                                           | —      | Yes                | [reporting.md](../specs/reporting.md)                              |
| Team live presence                                                      | —      | Yes                | [presence.md](../specs/presence.md)                                |
| Billing rates                                                           | —      | Yes                | [billing.md](../specs/billing.md)                                  |
| Multi-report export wizard                                              | —      | Yes                | [export.md](../specs/export.md)                                    |
| Export scale-up (preview, presets, schedules, shares, extended reports) | —      | Yes                | [export.md](../specs/export.md)                                    |
| Export my timesheet + My week summary                                   | Yes    | —                  | [export.md](../specs/export.md)                                    |

---

## Recommended build order

### Phase B — Finance & ops (next)

High value, mostly extends reporting/export patterns already in the API.

| Feature                     | App   | Description                                                                           |
| --------------------------- | ----- | ------------------------------------------------------------------------------------- |
| **Budget burn-down widget** | Admin | Chart + alerts on `budgetHours` vs logged (export `budget_vs_actual` report shipped). |

### Phase C — Workflow & accountability

Touches API rules, both apps, and period locking.

| Feature                        | App            | Description                                                                     |
| ------------------------------ | -------------- | ------------------------------------------------------------------------------- |
| **Timesheet submit / approve** | Client + Admin | Member submits week; admin approves/rejects; optional lock on approved periods. |
| **Locked periods**             | API            | No edits to time logs in closed payroll weeks (admin override optional).        |
| **Budget / idle alerts**       | Admin          | Notify when project budget ≥80%/100% or member has no logs for N days.          |
| **Project detail view**        | Admin          | Per-project dashboard + “export this project” shortcut.                         |

### Phase D — Scale & external users

Larger surface area; defer until B/C are stable.

| Feature                             | App          | Description                                                                                                 |
| ----------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| **Client portal**                   | New or Admin | External login (client org): read-only hours/amounts for their projects — distinct from workspace `MEMBER`. |
| **Scheduled export email delivery** | Admin        | SMTP delivery for existing `ExportSchedule` runs.                                                           |
| **Cross-workspace export**          | Admin        | Agencies with multiple workspaces (out of scope for v1 export).                                             |
| **Multi-currency / tax lines**      | Admin        | Beyond USD label; GST/VAT columns.                                                                          |

---

## Client app (`apps/client`) — planned features

Members should **capture time**, **see their progress**, and **close the loop** — without workspace-wide money or team comparisons.

| Feature                | Priority | Notes                                                               |
| ---------------------- | -------- | ------------------------------------------------------------------- |
| **Timesheet submit**   | Phase C  | “Submit week” → status: draft / submitted / approved / rejected.    |
| **Personal goals**     | Nice     | Optional daily target (e.g. 8h); no $ shown unless policy allows.   |
| **Quick actions**      | Nice     | Duplicate yesterday; pin favorite project/task.                     |
| **Reminders**          | Phase D  | Email/push: “No time logged Tuesday.”                               |
| **Mobile / PWA**       | Phase D  | Timer usable on phone; offline queue later.                         |
| **Read-only own rate** | Optional | Show member’s billable rate on entry if admin enables transparency. |

**Do not give members:** team utilization rankings, other members’ hours, workspace revenue totals, billing configuration, admin export wizard.

---

## Admin app (`apps/admin`) — planned features

Admins **configure**, **observe**, **bill**, and **export**.

| Feature                | Priority  | Notes                                                                                      |
| ---------------------- | --------- | ------------------------------------------------------------------------------------------ |
| **Invoice generation** | Phase B   | Draft invoice from billable export; PDF template.                                          |
| **Budget burn-down**   | Phase B   | Chart + alerts on `budgetHours` vs logged.                                                 |
| **Utilization report** | Phase B   | Member × week: logged vs expected hours (e.g. 40h).                                        |
| **Period compare**     | Nice      | This month vs last: Δ hours / Δ revenue.                                                   |
| **Task-level rollup**  | Nice      | Hours by task for SOW/retro.                                                               |
| **Workspace settings** | Phase B/C | Timezone, week start, rounding (15 min), default billable — use `Workspace.settings` JSON. |
| **Member management**  | Phase C   | Deactivate member, change role, resend invite (extend `/workspace`).                       |
| **Admin time logging** | Low       | Optional timer/timesheet in admin for internal projects only.                              |

---

## API & contracts (cross-cutting)

| Item                                       | Phase | Notes                                                   |
| ------------------------------------------ | ----- | ------------------------------------------------------- |
| `POST /export` presets body                | B     | Optional `presetId` or inline saved config.             |
| `GET /reporting/projects/:id`              | B     | Project-scoped dashboard.                               |
| `POST /timelogs/submit`, `PATCH …/approve` | C     | Workflow states on user-week aggregate or flag on logs. |
| `Workspace.settings` schema in contracts   | B     | Zod SSOT for rounding, timezone, features flags.        |
| Webhooks on `TimeLog` events               | D     | See [FUTURE_SCOPE.md](./FUTURE_SCOPE.md).               |

---

## Explicitly out of scope (for now)

- AI smart-categorization, idle arbitrator, IDE/Jira plugins — see [FUTURE_SCOPE.md](./FUTURE_SCOPE.md)
- Cross-workspace billing consolidation
- Replacing accounting tools (QuickBooks/Xero sync) — export-only integration path first

---

## How this doc stays current

1. When a feature ships, move it to **Shipped** and link the PR or module path.
2. Keep export-specific column/report design in the export plan, not here.
3. Prefer one phase per epic PR to keep reviews small.
