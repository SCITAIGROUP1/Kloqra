# Kloqra product roadmap

> **Future direction:** see [KLOQRA_FUTURE_PLAN.md](./KLOQRA_FUTURE_PLAN.md) for the full 2026–2027 horizons (H0–H4), epic queue, and success metrics. This file tracks **shipped vs planned** feature rows.

Product features beyond the core timer/timesheet loop. Shipped features link to specs under `docs/specs/`.

## Role model (reminder)

| App                        | Audience           | Purpose                                                |
| -------------------------- | ------------------ | ------------------------------------------------------ |
| **Client** (`apps/client`) | Workspace `MEMBER` | Log time on assigned project teams                     |
| **Admin** (`apps/admin`)   | Workspace `ADMIN`  | Operate the org: projects, billing, analytics, exports |

See [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) for workspace vs project team boundaries.

---

## Shipped

| Area                                                    | Client | Admin              | Spec                                                                            |
| ------------------------------------------------------- | ------ | ------------------ | ------------------------------------------------------------------------------- |
| Timer, timesheet, time tracker, recurrence              | Yes    | —                  | [timer.md](../specs/timer.md), [timelogs.md](../specs/timelogs.md)              |
| My projects / team invites                              | Yes    | Projects + invites | [projects.md](../specs/projects.md)                                             |
| Categories + bulk import                                | —      | Yes                | [categories.md](../specs/categories.md)                                         |
| Auth & workspace                                        | Yes    | Yes                | [auth-workspace.md](../specs/auth-workspace.md)                                 |
| Profile, settings, 2FA, sessions                        | Yes    | Yes                | [user-profile.md](../specs/user-profile.md)                                     |
| Member dashboard widgets                                | Yes    | —                  | [reporting.md](../specs/reporting.md) (member widgets)                          |
| Workspace analytics dashboard                           | —      | Yes                | [reporting.md](../specs/reporting.md)                                           |
| Team live presence                                      | —      | Yes                | [presence.md](../specs/presence.md)                                             |
| Billing rates                                           | —      | Yes                | [billing.md](../specs/billing.md)                                               |
| Multi-report export wizard, jobs, schedules, presets    | —      | Yes                | [export.md](../specs/export.md)                                                 |
| Export my timesheet + My week summary                   | Yes    | —                  | [export.md](../specs/export.md)                                                 |
| Admin global search (command palette)                   | —      | Yes                | [global-search.md](../specs/global-search.md)                                   |
| Timesheet submit / approve / amendments                 | Yes    | Yes                | [submissions.md](../specs/submissions.md)                                       |
| In-app notifications + WebSocket live sync              | Yes    | Yes                | [notifications-realtime.md](../specs/notifications-realtime.md)                 |
| Member help assistant                                   | Yes    | —                  | [assistant.md](../specs/assistant.md)                                           |
| Jira Cloud issue linking                                | Yes    | Yes (credentials)  | [projects.md](../specs/projects.md) (Jira section)                              |
| Public reporting API                                    | —      | Yes                | [api/public-reporting-client-guide.md](../api/public-reporting-client-guide.md) |
| Database table partitioning (`time_logs`, audit events) | —      | —                  | [DATABASE_PARTITIONING.md](./DATABASE_PARTITIONING.md)                          |

---

## Recommended build order

### Phase B — Finance & ops (next)

High value, mostly extends reporting/export patterns already in the API.

| Feature                     | App   | Description                                                                           |
| --------------------------- | ----- | ------------------------------------------------------------------------------------- |
| **Budget burn-down widget** | Admin | Chart + alerts on `budgetHours` vs logged (export `budget_vs_actual` report shipped). |
| **Project detail hub**      | Admin | Per-project dashboard + “export this project” shortcut.                               |

### Phase C — Workflow & accountability (remaining)

| Feature                    | App   | Description                                                            |
| -------------------------- | ----- | ---------------------------------------------------------------------- |
| **Budget / idle alerts**   | Admin | Notify when project budget ≥80%/100% or member has no logs for N days. |
| **Scheduled export email** | Admin | SMTP delivery polish for existing `ExportSchedule` runs (partial).     |

### Phase D — Scale & external users

Larger surface area; defer until B/C are stable.

| Feature                        | App          | Description                                                                                                 |
| ------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------- |
| **Client portal**              | New or Admin | External login (client org): read-only hours/amounts for their projects — distinct from workspace `MEMBER`. |
| **Cross-workspace export**     | Admin        | Agencies with multiple workspaces (out of scope for v1 export).                                             |
| **Multi-currency / tax lines** | Admin        | Beyond USD label; GST/VAT columns.                                                                          |

---

## Client app (`apps/client`) — planned features

| Feature                | Priority | Notes                                                               |
| ---------------------- | -------- | ------------------------------------------------------------------- |
| **Personal goals**     | Nice     | Daily target widget shipped; extend with streaks/history.           |
| **Quick actions**      | Nice     | Duplicate yesterday; pin favorite project/task.                     |
| **Reminders**          | Phase D  | Email/push: “No time logged Tuesday.” (in-app digest partial)       |
| **Mobile / PWA**       | Phase D  | Timer usable on phone; offline queue later.                         |
| **Read-only own rate** | Optional | Show member’s billable rate on entry if admin enables transparency. |

**Do not give members:** team utilization rankings, other members’ hours, workspace revenue totals, billing configuration, admin export wizard.

---

## Admin app (`apps/admin`) — planned features

| Feature                | Priority  | Notes                                                                          |
| ---------------------- | --------- | ------------------------------------------------------------------------------ |
| **Invoice generation** | Phase B   | Draft invoice from billable export; PDF template (partial via export invoice). |
| **Budget burn-down**   | Phase B   | Chart + alerts on `budgetHours` vs logged.                                     |
| **Utilization report** | Shipped   | Member × week heatmap API + widget — extend with alerts.                       |
| **Period compare**     | Nice      | This month vs last: Δ hours / Δ revenue.                                       |
| **Task-level rollup**  | Nice      | Hours by task for SOW/retro.                                                   |
| **Workspace settings** | Phase B/C | Timezone, week start, rounding — largely shipped in workspace settings UI.     |
| **Member management**  | Shipped   | Deactivate, role change, bulk invite — extend with audit.                      |
| **Admin time logging** | Low       | Optional timer/timesheet in admin for internal projects only.                  |

---

## API & contracts (cross-cutting)

| Item                                     | Phase | Notes                                                      |
| ---------------------------------------- | ----- | ---------------------------------------------------------- |
| `GET /reporting/projects/:id`            | B     | Project-scoped dashboard (summary endpoint exists).        |
| `Workspace.settings` schema in contracts | B     | Zod SSOT for rounding, timezone, features flags — partial. |
| Webhooks on `TimeLog` events             | D     | See [FUTURE_SCOPE.md](./FUTURE_SCOPE.md).                  |

---

## Explicitly out of scope (for now)

- AI smart-categorization, idle arbitrator, IDE/Jira plugins — see [FUTURE_SCOPE.md](./FUTURE_SCOPE.md)
- Cross-workspace billing consolidation
- Replacing accounting tools (QuickBooks/Xero sync) — export-only integration path first

---

## How this doc stays current

1. When a feature ships, move it to **Shipped** and link the spec or module path.
2. Keep export-specific column/report design in [export.md](../specs/export.md), not here.
3. Prefer one phase per epic PR to keep reviews small.
