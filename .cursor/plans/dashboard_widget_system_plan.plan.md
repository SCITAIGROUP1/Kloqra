# Kloqra Admin — Dashboard Widget System Plan

Upgrade the admin dashboard from a static fixed-layout page into a **true collective widget
experience**: every panel is an independently show/hide-able, draggable, resizable widget.
Widget layout preferences are persisted per workspace in `localStorage` and survive page reloads.

The plan is split into **6 progressive phases** that can each be shipped, tested, and committed
independently. Each phase builds on the last — you never break the existing dashboard while
progressing through them.

**Phases 1–5** cover infrastructure + the 14 existing/already-planned widgets.
**Phase 6** covers 12 all-new analytics widgets discovered through R&D against the live API,
contracts, and data models.

---

## Phase Overview

| Phase | Name                      | Deliverable                                    | Risk   |
| ----- | ------------------------- | ---------------------------------------------- | ------ |
| **1** | Foundation & Registry     | Widget catalogue + localStorage store          | Low    |
| **2** | Widget Shell              | Reusable card wrapper with drag handle + hide  | Low    |
| **3** | Grid Layout Engine        | `react-grid-layout` integration, drag & resize | Medium |
| **4** | Widget Control Panel      | Glassmorphism toolbar, show/hide chips, reset  | Low    |
| **5** | Existing Widget Migration | 3 previously-hidden charts become real widgets | Low    |
| **6** | New Analytics Widgets     | 12 brand-new data-rich widgets (R&D based)     | Medium |

---

## Phase 1 — Foundation & Widget Registry

> **Goal**: Build the data layer. No visual change to the dashboard yet.

### 1.1 Install `react-grid-layout`

**Files:**

- MODIFY `apps/admin/package.json` — add `"react-grid-layout": "^1.4.4"` to `dependencies`
  and `"@types/react-grid-layout": "^1.3.5"` to `devDependencies`

**Command after editing:**

```bash
pnpm install --filter @kloqra/admin
```

---

### 1.2 Widget Registry

Define the catalogue of all available widgets — their id, label, description, default grid size,
min/max constraints, default visibility, and the lucide icon to represent them.

**Files:**

- NEW `apps/admin/src/features/dashboard/widget-registry.ts`

Initial widgets (14 — existing + 3 previously hidden):

```
Widget ID              | Label                  | Default Size | Visible | Data source
-----------------------|------------------------|--------------|---------|---------------------
stat_total_hours       | Total Hours            | w:2 h:1      | ✅       | DashboardReportDto.workspace
stat_billable          | Billable Hours         | w:2 h:1      | ✅       | DashboardReportDto.workspace
stat_nonbillable       | Non-Billable           | w:2 h:1      | ✅       | DashboardReportDto.workspace
stat_revenue           | Revenue                | w:2 h:1      | ✅       | DashboardReportDto.workspace
stat_projects          | Active Projects        | w:2 h:1      | ✅       | DashboardReportDto.workspace
stat_members           | Active Members         | w:2 h:1      | ✅       | DashboardReportDto.workspace
budget_burndown        | Budget Burn-Down       | w:6 h:3      | ✅       | /reporting/projects/:id/budget
team_utilization       | Team Utilization       | w:6 h:3      | ✅       | /reporting/utilization
daily_chart            | Daily Time Chart       | w:12 h:4     | ✅       | DashboardReportDto.dailyHours
breakdown_table        | Breakdown Table        | w:7 h:4      | ✅       | DashboardReportDto.timeByProject/User
distribution_donut     | Distribution Donut     | w:5 h:4      | ✅       | DashboardReportDto.timeByProject/User
weekly_chart           | Weekly Breakdown       | w:6 h:4      | ❌       | DashboardReportDto.weeklyHours
revenue_by_project     | Revenue by Project     | w:6 h:4      | ❌       | DashboardReportDto.timeByProject
hours_by_member        | Hours by Member        | w:12 h:4     | ❌       | DashboardReportDto.timeByUser
```

New widgets (Phase 6 — registered now, implemented later):
All 12 new widgets from Phase 6 are registered here with `defaultVisible: false`.

Registry exports:

- `WIDGET_REGISTRY: WidgetDefinition[]` — ordered list
- `DEFAULT_LAYOUT: WidgetLayoutItem[]` — position+size defaults
- `WidgetDefinition` type
- `WidgetLayoutItem` type — `{ id, x, y, w, h, visible }`

---

### 1.3 Widget Layout Store

A custom hook backed by `zustand` (already in the project) managing layout state.

**Files:**

- NEW `apps/admin/src/features/dashboard/use-widget-layout.ts`

Exports:

- `useWidgetLayout(workspaceId: string)` hook
- `toggleWidget(id)` — flip `visible`, save to localStorage
- `resetLayout()` — restore DEFAULT_LAYOUT, save
- `updateLayout(newItems)` — called by RGL on drag/resize end, save
- Storage key: `kloqra-widget-layout-${workspaceId}`
- On mount: reads localStorage, merges with registry (adds newly registered widgets at their
  default position without clobbering existing saved positions)

---

### Phase 1 Verification

```bash
pnpm typecheck --filter @kloqra/admin
pnpm lint --filter @kloqra/admin
```

No visual change — dashboard renders identically.

---

## Phase 2 — Widget Shell Component

> **Goal**: Reusable card wrapper every widget lives inside.

### 2.1 `WidgetShell` Component

**Files:**

- NEW `apps/admin/src/features/dashboard/widget-shell.tsx`

Features:

- `GripVertical` drag handle (visible only in edit mode, top-left)
- ⋯ `DropdownMenu` (always visible, top-right) with **Hide this widget** action
- `className` + `style` forwarding for react-grid-layout positional injection
- `animate-in fade-in zoom-in-95 duration-300` entry animation
- Props: `id`, `label`, `isEditing`, `onHide`, `children`, `className?`, `style?`

### 2.2 Smoke-test wrap

Wrap `BudgetBurnDownWidget` in `WidgetShell` in `dashboard-page.tsx` temporarily to confirm
the shell renders correctly in light and dark mode before Phase 3.

---

### Phase 2 Verification

- Drag handle and ⋯ menu appear correctly
- Dark mode consistent with admin shell
- Keyboard accessible (Tab, Enter, Escape on menu)

---

## Phase 3 — Grid Layout Engine

> **Goal**: Replace hard-coded CSS grid with `react-grid-layout`.

### 3.1 Import RGL Styles

**Files:**

- MODIFY `apps/admin/src/app/globals.css`

```css
@import "react-grid-layout/css/styles.css";
@import "react-grid-layout/css/resizable.css";
```

---

### 3.2 Refactor `DashboardPage` to RGL

Replace multiple hard-coded `<div className="grid ...">` sections with a single
`<ResponsiveGridLayout>` that:

- Reads visible items from `useWidgetLayout`
- Renders only `visible === true` items inside `WidgetShell`
- Passes `onLayoutChange` → `updateLayout`
- `isDraggable` and `isResizable` are only true when `isEditing`

Grid config:

```ts
cols={{ lg: 12, md: 8, sm: 4 }}
rowHeight={80}
breakpoints={{ lg: 1200, md: 768, sm: 480 }}
margin={[16, 16]}
```

**Files:**

- MODIFY `apps/admin/src/features/dashboard/dashboard-page.tsx`

---

### 3.3 Temporary Edit Toggle

Adds a plain `<Button>` to `PageHeader` to toggle `isEditing` for testing drag/resize before
the real control panel arrives in Phase 4.

---

### Phase 3 Verification

- Dashboard loads same data (no regression)
- Edit mode: drag a widget → reload → position preserved
- Resize a widget → reload → size preserved
- Responsive: 1440px / 1024px / 768px / 375px all work
- `pnpm typecheck` passes

---

## Phase 4 — Widget Control Panel

> **Goal**: Production-quality glassmorphism customize toolbar.

### 4.1 `WidgetControlPanel` Component

Sticky banner above grid when `isEditing === true`.

**Files:**

- NEW `apps/admin/src/features/dashboard/widget-control-panel.tsx`

Styling: `backdrop-blur-md bg-card/80 border-b border-border/60 shadow-sm sticky top-0 z-50`

Contents:

- **Left**: scrollable row of widget chips (icon + label, toggled with color shift)
- **Right**: `Reset layout` (RotateCcw icon, sonner toast on reset) + `Done` button

Chip states:

- Visible: `bg-primary/10 text-primary border-primary/30`
- Hidden: `bg-muted text-muted-foreground opacity-60`

Animation: `animate-in slide-in-from-top-2 fade-in duration-200`

---

### 4.2 Connect to `DashboardPage`

Replace temporary Phase 3 button with:

- `Settings2` icon **"Customize"** button in `PageHeader` (outline, becomes secondary when active)
- Mount `<WidgetControlPanel>` conditionally

**Files:**

- MODIFY `apps/admin/src/features/dashboard/dashboard-page.tsx`

---

### 4.3 Keyboard Shortcut

`Escape` closes the panel via `useEffect` + `keydown` listener.

---

### Phase 4 Verification

- "Customize" button visible in header
- Widget chips correctly reflect visibility state
- Toggling chip shows/hides widget immediately
- Reset restores layout + shows toast
- Done and Escape close panel
- Full keyboard nav on chips (role="checkbox", aria-checked)

---

## Phase 5 — Existing Widget Migration & Cleanup

> **Goal**: Extract the 3 previously hidden charts as proper standalone widget components and
> remove legacy code.

### 5.1 Extract Hidden Charts

**Files:**

- MODIFY `apps/admin/src/components/dashboard-extra-charts.tsx` — export three named components:
  - `WeeklyBarChart` — stacked billable vs non-billable by week
  - `RevenueByProjectChart` — bar chart, revenue per project
  - `HoursByMemberChart` — stacked bar per member
- MODIFY `apps/admin/src/components/charts-lazy.tsx` — add lazy exports for the three

### 5.2 Skeleton Consistency

**Files:**

- MODIFY `apps/admin/src/components/chart-skeleton.tsx` — add optional `height` prop

### 5.3 Widget Entry Animation

Apply `animate-in fade-in zoom-in-95 duration-300` inside `WidgetShell` on mount.

### 5.4 Accessibility

- Grid items: `role="region"` + `aria-label={widget.label}`
- Drag handles: `aria-roledescription="sortable"`
- Control panel chips: `role="checkbox"` + `aria-checked`

### 5.5 Remove Legacy Code

**Files:**

- MODIFY `apps/admin/src/features/dashboard/dashboard-page.tsx` — remove `showMoreCharts`
  state and the ghost `"Show weekly, revenue & member charts"` button

---

### Phase 5 Verification

- All 14 widgets toggle on/off from control panel
- Entry animation plays when toggling visible
- No ghost button anywhere
- `pnpm typecheck` + `pnpm lint` clean

---

## Phase 6 — New Analytics Widgets (R&D)

> **Goal**: Deliver 12 new data-rich widgets backed by existing API data. Each widget is
> **hidden by default** — users opt in via the control panel.
>
> R&D findings: all widgets below derive data from routes and DTOs that **already exist**
> in the API (`DashboardReportDto`, `/reporting/utilization`, `/reporting/projects/:id/budget`,
> `/billing/rates`, `/timesheets/pending`, `/presence/snapshot`, `/timelogs`).
> Only Widgets 6.9–6.12 require a small new API endpoint each — noted explicitly.

---

### 6.1 — Billability Gauge _(Radial / Gauge Chart)_

**Widget ID**: `billability_gauge`  
**Default size**: w:3 h:3  
**Chart type**: Radial gauge (Recharts `RadialBarChart`)  
**Data**: `DashboardReportDto.workspace.billablePercent` — already in the dashboard response

Shows the workspace-wide billable percentage as a circular gauge with a color-coded arc:

- Green: ≥ 80%
- Amber: 50–79%
- Red: < 50%

Center label: large `XX%` + small "Billable rate"

No new API endpoint needed — data already arrives with the main dashboard fetch.

---

### 6.2 — Revenue Trend Line _(Line Chart)_

**Widget ID**: `revenue_trend`  
**Default size**: w:6 h:3  
**Chart type**: Recharts `LineChart` with gradient area fill  
**Data**: `DashboardReportDto.weeklyHours[].billableAmount` (already computed server-side
as billable amount per week is embedded in the existing weekly aggregation logic —
`billableAmount` just needs to be added to the `weeklyHoursSchema` DTO and returned from
the service)

Shows cumulative revenue per week as a smooth line with an area gradient underneath.
Tooltip shows week start date + `$revenue`.

**Files:**

- MODIFY `packages/contracts/src/dto/reporting.dto.ts` — add `billableAmount: z.number()` to
  `weeklyHoursSchema`
- MODIFY `apps/api/src/modules/reporting/application/reporting.service.ts` — the `weekly` map
  already tracks `billableAmount`; it just isn't included in the returned `weeklyHours` array.
  One-line fix.
- NEW `apps/admin/src/features/dashboard/widgets/revenue-trend-widget.tsx`

---

### 6.3 — Project Health Matrix _(Multi-bar comparison)_

**Widget ID**: `project_health`  
**Default size**: w:6 h:4  
**Chart type**: Grouped `BarChart` (Recharts) — 3 bars per project: Total Hours, Budget %, Revenue  
**Data**: Combines `DashboardReportDto.timeByProject` with the budget data from
`/reporting/projects/:id/budget` (existing endpoint, existing widget calls it already)

For each project shows side-by-side bars for:

1. Hours logged (vs budget if set)
2. Billable amount
3. Budget consumed %

Color-coded: green/amber/red per project health status. Great for a quick "which projects need
attention" overview.

No new API endpoint needed.

**Files:**

- NEW `apps/admin/src/features/dashboard/widgets/project-health-widget.tsx`

---

### 6.4 — Member Leaderboard _(Horizontal Bar Chart)_

**Widget ID**: `member_leaderboard`  
**Default size**: w:4 h:4  
**Chart type**: Horizontal `BarChart` (Recharts) sorted desc by hours  
**Data**: `DashboardReportDto.timeByUser` — already in dashboard response

Horizontal bar chart — one row per member, sorted by `totalHours` descending.
Each bar shows total hours with a billable sub-segment overlay.
Avatar initials + name as Y-axis labels. Tooltip shows hours + billable amount.

No new API endpoint needed.

**Files:**

- NEW `apps/admin/src/features/dashboard/widgets/member-leaderboard-widget.tsx`

---

### 6.5 — Billable vs Non-Billable Donut _(Pie / Donut Chart)_

**Widget ID**: `billable_split_donut`  
**Default size**: w:3 h:3  
**Chart type**: Recharts `PieChart` (donut, 2 segments)  
**Data**: `DashboardReportDto.workspace.billableHours` + `.nonBillableHours`

Focused 2-segment donut: billable (primary color) vs non-billable (muted).
Center label: total hours clock-format.
Simpler and more scannable than the existing 6-segment distribution donut.

No new API endpoint needed.

**Files:**

- NEW `apps/admin/src/features/dashboard/widgets/billable-split-donut-widget.tsx`

---

### 6.6 — Hourly Rate Overview _(Table + Stat)_

**Widget ID**: `hourly_rates`  
**Default size**: w:4 h:3  
**Chart type**: Styled table  
**Data**: `/billing/rates` (existing endpoint, `HourlyRateDto[]`)

Lists all hourly rates in the workspace: global rate, per-user overrides, per-project overrides.
Shows effective date + rate. Highlights the active/most-recent rate per member.

No new API endpoint needed.

**Files:**

- NEW `apps/admin/src/features/dashboard/widgets/hourly-rates-widget.tsx`

---

### 6.7 — Live Presence Feed _(Real-time list)_

**Widget ID**: `live_presence`  
**Default size**: w:4 h:3  
**Chart type**: Live scrolling list (SSE stream)  
**Data**: `/presence/snapshot` (existing endpoint, `PresenceSnapshotDto`) +
`/presence/stream` (SSE, already used by `LivePresenceBadge`)

Shows who is currently tracking time, on which task and project, and for how long.
Animated green pulse dot per active member. Updates in real time via the existing SSE stream.
Already have `LivePresenceBadge` as a reference for SSE consumption.

No new API endpoint needed.

**Files:**

- NEW `apps/admin/src/features/dashboard/widgets/live-presence-widget.tsx`

---

### 6.8 — Pending Timesheet Approvals _(Action List)_

**Widget ID**: `pending_timesheets`  
**Default size**: w:5 h:4  
**Chart type**: Action list with approve/reject buttons  
**Data**: `/timesheets/pending` (existing endpoint, `PendingTimesheetDto[]`)

Shows all SUBMITTED timesheets awaiting admin review. Each row: member name, project,
period, hours logged, time since submission. Quick **Approve** / **Reject** inline buttons
that call the existing `/timesheets/:id/approve` and `/timesheets/:id/reject` endpoints.
Badge count on the widget shell header showing pending count.

No new API endpoint needed.

**Files:**

- NEW `apps/admin/src/features/dashboard/widgets/pending-timesheets-widget.tsx`

---

### 6.9 — Time of Day Heatmap _(GitHub-style heatmap)_

**Widget ID**: `time_of_day_heatmap`  
**Default size**: w:8 h:3  
**Chart type**: CSS grid heatmap (hour-of-day × day-of-week, 24×7)  
**Data**: **NEW endpoint needed** — `GET /reporting/heatmap?from=&to=&workspaceId=`

Returns a 24×7 matrix of hours logged per hour-of-day per day-of-week aggregated across
the date range. Shows when the team is most productive. Dark cells = peak hours.

**New API work:**

- NEW `GET /reporting/heatmap` in `reporting.service.ts` and `reporting.controller.ts`
- New route: `ROUTES.REPORTING.HEATMAP = "/reporting/heatmap"` in contracts
- Response DTO: `{ slots: Array<{ hour: number; dayOfWeek: number; hours: number }> }`

**Files:**

- MODIFY `packages/contracts/src/routes.ts`
- MODIFY `packages/contracts/src/dto/reporting.dto.ts`
- MODIFY `apps/api/src/modules/reporting/application/reporting.service.ts`
- MODIFY `apps/api/src/modules/reporting/interface/...` (controller)
- NEW `apps/admin/src/features/dashboard/widgets/heatmap-widget.tsx`

---

### 6.10 — Task Breakdown Pie _(Pie Chart)_

**Widget ID**: `task_breakdown`  
**Default size**: w:4 h:4  
**Chart type**: Recharts `PieChart` (donut)  
**Data**: **NEW endpoint needed** — `GET /reporting/tasks?from=&to=`

Aggregates total hours per task name within the date range. Shows top 8 tasks as pie
segments + "Other". Useful for understanding where time is actually going at the task level
(not just project level).

**New API work:**

- NEW `GET /reporting/tasks` — groups `TimeLog` by `task.taskName`, sums `durationSec`
- Response DTO: `{ tasks: Array<{ taskId, taskName, totalHours, billableHours }> }`
- Route: `ROUTES.REPORTING.TASKS = "/reporting/tasks"`

**Files:**

- MODIFY `packages/contracts/src/routes.ts`
- MODIFY `packages/contracts/src/dto/reporting.dto.ts`
- MODIFY reporting service + controller
- NEW `apps/admin/src/features/dashboard/widgets/task-breakdown-widget.tsx`

---

### 6.11 — Billing Rate Efficiency _(Scatter / Bubble Chart)_

**Widget ID**: `rate_efficiency`  
**Default size**: w:6 h:4  
**Chart type**: Recharts `ScatterChart` — X=hours, Y=revenue, bubble size=billable %  
**Data**: Combines `DashboardReportDto.timeByProject` (hours, revenue) with
`/billing/rates` (rates). All data already available — just a new visual combining two
existing data sets client-side.

Each bubble = one project. Position shows hours vs revenue. Bubble size = billable ratio.
Makes immediately visible which projects are "expensive time / low revenue" vs "high efficiency".

No new API endpoint needed.

**Files:**

- NEW `apps/admin/src/features/dashboard/widgets/rate-efficiency-widget.tsx`

---

### 6.12 — Running Timer Count _(Live Stat Card)_

**Widget ID**: `active_timers`  
**Default size**: w:2 h:2  
**Chart type**: Animated stat card  
**Data**: **NEW endpoint needed** — `GET /timer/active-count` (workspace-scoped)

Shows how many team members currently have an active timer running. Animated pulsing dot.
Taps into the existing `Timer` model in Prisma — a simple count query.

**New API work:**

- NEW `GET /timer/active-count` in timer controller
- Response: `{ count: number; members: Array<{ userId, userName, projectName, taskName }> }`
- Route: `ROUTES.TIMER.ACTIVE_COUNT = "/timer/active-count"`

**Files:**

- MODIFY `packages/contracts/src/routes.ts`
- MODIFY `apps/api/src/modules/timer/` (service + controller)
- NEW `apps/admin/src/features/dashboard/widgets/active-timers-widget.tsx`

---

## Full Widget Catalogue (26 total)

### Group A — KPI Stat Cards (always-small, 1×1 to 2×2)

| #   | Widget ID               | Label              | Source                  |
| --- | ----------------------- | ------------------ | ----------------------- |
| 1   | `stat_total_hours`      | Total Hours        | Dashboard DTO           |
| 2   | `stat_billable`         | Billable Hours     | Dashboard DTO           |
| 3   | `stat_nonbillable`      | Non-Billable Hours | Dashboard DTO           |
| 4   | `stat_revenue`          | Revenue            | Dashboard DTO           |
| 5   | `stat_projects`         | Active Projects    | Dashboard DTO           |
| 6   | `stat_members`          | Active Members     | Dashboard DTO           |
| 7   | `active_timers` _(new)_ | Live Active Timers | NEW /timer/active-count |

### Group B — Time & Trend Charts

| #   | Widget ID                     | Label               | Chart       | Source                   |
| --- | ----------------------------- | ------------------- | ----------- | ------------------------ |
| 8   | `daily_chart`                 | Daily Time Chart    | Stacked Bar | Dashboard DTO            |
| 9   | `weekly_chart`                | Weekly Breakdown    | Stacked Bar | Dashboard DTO            |
| 10  | `revenue_trend` _(new)_       | Revenue Trend       | Line + Area | Dashboard DTO (extended) |
| 11  | `time_of_day_heatmap` _(new)_ | Time of Day Heatmap | CSS Heatmap | NEW /reporting/heatmap   |

### Group C — Composition / Distribution

| #   | Widget ID                      | Label              | Chart         | Source               |
| --- | ------------------------------ | ------------------ | ------------- | -------------------- |
| 12  | `distribution_donut`           | Distribution Donut | Donut         | Dashboard DTO        |
| 13  | `billable_split_donut` _(new)_ | Billable Split     | Donut (2-seg) | Dashboard DTO        |
| 14  | `billability_gauge` _(new)_    | Billability Gauge  | Radial Gauge  | Dashboard DTO        |
| 15  | `task_breakdown` _(new)_       | Task Breakdown     | Donut         | NEW /reporting/tasks |

### Group D — Project Analytics

| #   | Widget ID                 | Label                 | Chart          | Source                         |
| --- | ------------------------- | --------------------- | -------------- | ------------------------------ |
| 16  | `budget_burndown`         | Budget Burn-Down      | Progress bars  | /reporting/projects/:id/budget |
| 17  | `revenue_by_project`      | Revenue by Project    | Bar            | Dashboard DTO                  |
| 18  | `project_health` _(new)_  | Project Health Matrix | Grouped Bar    | Dashboard DTO + budget         |
| 19  | `rate_efficiency` _(new)_ | Rate Efficiency       | Scatter/Bubble | Dashboard DTO + billing        |

### Group E — People / Team

| #   | Widget ID                    | Label                | Chart          | Source                 |
| --- | ---------------------------- | -------------------- | -------------- | ---------------------- |
| 20  | `team_utilization`           | Team Utilization     | Table          | /reporting/utilization |
| 21  | `hours_by_member`            | Hours by Member      | Stacked Bar    | Dashboard DTO          |
| 22  | `breakdown_table`            | Breakdown Table      | Table          | Dashboard DTO          |
| 23  | `member_leaderboard` _(new)_ | Member Leaderboard   | Horizontal Bar | Dashboard DTO          |
| 24  | `hourly_rates` _(new)_       | Hourly Rate Overview | Table          | /billing/rates         |

### Group F — Live / Workflow

| #   | Widget ID                    | Label              | Chart       | Source                   |
| --- | ---------------------------- | ------------------ | ----------- | ------------------------ |
| 25  | `live_presence` _(new)_      | Live Presence Feed | Live list   | /presence/snapshot + SSE |
| 26  | `pending_timesheets` _(new)_ | Pending Approvals  | Action list | /timesheets/pending      |

---

## Full File Changeset Summary

| File                                                                        | Action                                                                  | Phase           |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------- |
| `apps/admin/package.json`                                                   | MODIFY — add react-grid-layout                                          | 1               |
| `apps/admin/src/features/dashboard/widget-registry.ts`                      | NEW                                                                     | 1               |
| `apps/admin/src/features/dashboard/use-widget-layout.ts`                    | NEW                                                                     | 1               |
| `apps/admin/src/features/dashboard/widget-shell.tsx`                        | NEW                                                                     | 2               |
| `apps/admin/src/app/globals.css`                                            | MODIFY — RGL CSS                                                        | 3               |
| `apps/admin/src/features/dashboard/dashboard-page.tsx`                      | MODIFY                                                                  | 3–5             |
| `apps/admin/src/features/dashboard/widget-control-panel.tsx`                | NEW                                                                     | 4               |
| `apps/admin/src/components/dashboard-extra-charts.tsx`                      | MODIFY                                                                  | 5               |
| `apps/admin/src/components/charts-lazy.tsx`                                 | MODIFY                                                                  | 5               |
| `apps/admin/src/components/chart-skeleton.tsx`                              | MODIFY                                                                  | 5               |
| `packages/contracts/src/dto/reporting.dto.ts`                               | MODIFY — add billableAmount to weekly                                   | 6.2             |
| `apps/api/.../reporting.service.ts`                                         | MODIFY — expose billableAmount in weekly, add heatmap + tasks endpoints | 6.2, 6.9, 6.10  |
| `packages/contracts/src/routes.ts`                                          | MODIFY — add HEATMAP, TASKS, ACTIVE_COUNT routes                        | 6.9, 6.10, 6.12 |
| `apps/api/.../timer/` (service + controller)                                | MODIFY — add active-count endpoint                                      | 6.12            |
| `apps/admin/src/features/dashboard/widgets/billability-gauge-widget.tsx`    | NEW                                                                     | 6.1             |
| `apps/admin/src/features/dashboard/widgets/revenue-trend-widget.tsx`        | NEW                                                                     | 6.2             |
| `apps/admin/src/features/dashboard/widgets/project-health-widget.tsx`       | NEW                                                                     | 6.3             |
| `apps/admin/src/features/dashboard/widgets/member-leaderboard-widget.tsx`   | NEW                                                                     | 6.4             |
| `apps/admin/src/features/dashboard/widgets/billable-split-donut-widget.tsx` | NEW                                                                     | 6.5             |
| `apps/admin/src/features/dashboard/widgets/hourly-rates-widget.tsx`         | NEW                                                                     | 6.6             |
| `apps/admin/src/features/dashboard/widgets/live-presence-widget.tsx`        | NEW                                                                     | 6.7             |
| `apps/admin/src/features/dashboard/widgets/pending-timesheets-widget.tsx`   | NEW                                                                     | 6.8             |
| `apps/admin/src/features/dashboard/widgets/heatmap-widget.tsx`              | NEW                                                                     | 6.9             |
| `apps/admin/src/features/dashboard/widgets/task-breakdown-widget.tsx`       | NEW                                                                     | 6.10            |
| `apps/admin/src/features/dashboard/widgets/rate-efficiency-widget.tsx`      | NEW                                                                     | 6.11            |
| `apps/admin/src/features/dashboard/widgets/active-timers-widget.tsx`        | NEW                                                                     | 6.12            |

---

## Open Decisions (answer before Phase 3)

1. **Grid library**: `react-grid-layout` (recommended) vs pure CSS preset sizes?
2. **Persistence**: `localStorage` (default) vs server-synced per user?
3. **Control panel position**: Sticky top banner (default) vs slide-in drawer vs modal?

---

## Progress Tracking

- [ ] **Phase 1** — Foundation & Registry
  - [ ] 1.1 Install react-grid-layout
  - [ ] 1.2 Widget registry (`widget-registry.ts`)
  - [ ] 1.3 Layout store (`use-widget-layout.ts`)
- [ ] **Phase 2** — Widget Shell
  - [ ] 2.1 `WidgetShell` component
  - [ ] 2.2 Smoke-test on one widget
- [ ] **Phase 3** — Grid Layout Engine
  - [ ] 3.1 Import RGL CSS
  - [ ] 3.2 Refactor `DashboardPage` to RGL
  - [ ] 3.3 Temporary edit toggle
- [ ] **Phase 4** — Widget Control Panel
  - [ ] 4.1 `WidgetControlPanel` component
  - [ ] 4.2 Connect to `DashboardPage`
  - [ ] 4.3 Keyboard shortcut (Escape)
- [ ] **Phase 5** — Existing Widget Migration & Cleanup
  - [ ] 5.1 Extract 3 hidden charts as standalone widgets
  - [ ] 5.2 Widget skeleton consistency
  - [ ] 5.3 Widget entry animations
  - [ ] 5.4 Accessibility audit
  - [ ] 5.5 Remove legacy "show more" button
- [ ] **Phase 6** — New Analytics Widgets
  - [ ] 6.1 Billability Gauge (Radial) — existing data
  - [ ] 6.2 Revenue Trend Line — minor DTO extension
  - [ ] 6.3 Project Health Matrix (Grouped Bar) — existing data
  - [ ] 6.4 Member Leaderboard (Horizontal Bar) — existing data
  - [ ] 6.5 Billable Split Donut — existing data
  - [ ] 6.6 Hourly Rate Overview (Table) — existing endpoint
  - [ ] 6.7 Live Presence Feed (SSE) — existing endpoint
  - [ ] 6.8 Pending Timesheet Approvals (Action List) — existing endpoint
  - [ ] 6.9 Time of Day Heatmap — NEW API endpoint
  - [ ] 6.10 Task Breakdown Pie — NEW API endpoint
  - [ ] 6.11 Rate Efficiency Scatter/Bubble — existing data
  - [ ] 6.12 Running Timer Count (Live Stat) — NEW API endpoint
