# Kloqra — Next Level-Up Plan

## What's Already Shipped (v0.3.0)

Kloqra is a solid production-quality monorepo. Here's what's fully implemented:

| Area                                                         | Status                            |
| ------------------------------------------------------------ | --------------------------------- |
| NestJS API + Next.js 15 Client & Admin                       | ✅                                |
| Auth (JWT + refresh token rotation)                          | ✅                                |
| Timer engine (Redis) + animated clock ring                   | ✅                                |
| Timesheet (day/week/month/list views, drag/resize/duplicate) | ✅                                |
| Budget burn-down widget + utilization heatmap                | ✅                                |
| PDF Invoice generator + 3-step wizard                        | ✅                                |
| Timesheet submit/approve workflow                            | ✅                                |
| Keyboard shortcuts, tab title sync, toast notifications      | ✅                                |
| Sentry error monitoring, Helmet, rate limiting               | ✅                                |
| Scheduled export runner (cron ticking, file generation)      | ✅                                |
| Workspace settings UI (admin)                                | ✅                                |
| Quick actions (favorites + recents)                          | ✅                                |
| Daily goal widget (hardcoded 8 hrs target)                   | ⚠️ not editable                   |
| Export email delivery                                        | ⚠️ logs to console, no real email |
| PWA / offline support                                        | ❌ not started                    |
| Onboarding flow                                              | ❌ not started                    |

---

## Proposed Level-Up Sprints

### Sprint A — High-Impact Gaps (1–2 days each) 🔥

These are unfinished features that are almost ready — low effort, high payoff.

#### A1. Wire Real Email Delivery for Scheduled Exports

**Gap**: `ExportScheduleService.runSchedule()` generates the file and logs to console but never emails anyone. `recipientEmails` is stored in DB and ready.

**Files:**

- [MODIFY] `apps/api/src/modules/export/application/export-schedule.service.ts` — inject `NodemailerService`; send PDF/XLSX attachment to `schedule.recipientEmails`.
- [NEW] `apps/api/src/common/mailer/mailer.module.ts` + `mailer.service.ts` — thin Nodemailer wrapper using `SMTP_HOST/USER/PASS` env vars; graceful no-op when unconfigured.
- [MODIFY] `apps/api/src/load-env.ts` — add optional `SMTP_*` env vars.

#### A2. Editable Daily Goal (persist to workspace settings)

**Gap**: `DailyGoalWidget` hardcodes `targetSeconds = 8 * 3600`. The workspace settings JSON has a `dailyTargetHours` key in contracts but there is no UI to set it, and the widget never reads it.

**Files:**

- [MODIFY] `apps/client/src/features/timer/daily-goal-widget.tsx` — read `dailyTargetHours` from workspace settings via store; show an inline edit pencil icon.
- [MODIFY] `apps/admin/src/features/workspace/workspace-page.tsx` — add `dailyTargetHours` field to workspace settings form.
- [MODIFY] `packages/contracts/src/workspace-settings.ts` — confirm `dailyTargetHours` field exists, add Zod validation.

#### A3. `GET /timelogs/yesterday-summary` Endpoint + Client Widget

**Gap**: The plan specifies this endpoint (`2.6 Quick Actions`) but it was never created. Quick actions only show favorites/recents — it doesn't show _yesterday's total_.

**Files:**

- [NEW] endpoint in `apps/api/src/modules/timelogs/interface/http/timelogs.controller.ts` — `GET /timelogs/yesterday-summary` returning `{ totalSec, billableSec, topTask }`.
- [MODIFY] `apps/client/src/features/timer/quick-actions.tsx` — add a "Yesterday" summary strip above the favorites/recents cards.

---

### Sprint B — UX Polish & Missing Flows 🎨

#### B1. Onboarding Flow (Client)

**Gap**: Completely missing. First-time users land on the timer page with no guidance.

**Files:**

- [NEW] `apps/client/src/features/onboarding/onboarding-overlay.tsx` — multi-step modal (3 steps: Welcome → Create first project → Start timer). Shown only once (localStorage flag `chronomint_onboarding_done`).
- [MODIFY] `apps/client/src/app/(workspace)/timer/page.tsx` — render `<OnboardingOverlay />`.

#### B2. PWA / Installable App (Client)

**Gap**: `next-pwa` is not configured. There is no `manifest.json` or service worker.

**Files:**

- [MODIFY] `apps/client/next.config.ts` — add `@ducanh2912/next-pwa` (Next 15 compatible).
- [NEW] `apps/client/public/manifest.json` — app name, icons, theme color, `display: standalone`.
- [NEW] `apps/client/public/icon-192.png` + `icon-512.png` — generate logo assets.
- [MODIFY] `apps/client/src/app/layout.tsx` — add `<link rel="manifest">` + `theme-color` meta.

#### B3. Timesheet — Confirm Dialog Instead of `window.confirm`

**Gap**: `deleteEntry()` in `timesheet-page.tsx` uses a blocking `window.confirm`. This breaks SSR safety and is visually jarring.

**Files:**

- [NEW] `packages/ui/src/components/ui/confirm-dialog.tsx` — Radix `<AlertDialog>` wrapper with primary/destructive actions.
- [MODIFY] `apps/client/src/features/timesheet/timesheet-page.tsx` — replace `window.confirm` with the new dialog.
- [MODIFY] `packages/ui/src/index.ts` — export `ConfirmDialog`.

#### B4. Admin Dashboard — Live Presence Indicator Polish

**Gap**: The live presence SSE endpoint exists (`/presence`) but the admin dashboard doesn't prominently surface "who is clocked in right now."

**Files:**

- [NEW] `apps/admin/src/components/live-presence-badge.tsx` — pulsing green dot + "N members tracking now" badge shown in the dashboard header.
- [MODIFY] `apps/admin/src/features/dashboard/dashboard-page.tsx` — add `<LivePresenceBadge />` in the `PageHeader` actions slot.

---

### Sprint C — Developer Experience & Quality 🛠️

#### C1. OpenAPI / Swagger Docs

**Gap**: The improvement plan listed this but it was marked "Completed". Verify: if `app.use(swagger)` is not in `main.ts`, it's not done.

**Files:**

- [MODIFY] `apps/api/src/main.ts` — `SwaggerModule.setup('api/docs', ...)` with `@nestjs/swagger`.
- Annotate key controllers with `@ApiTags`, `@ApiOperation`, `@ApiResponse`.

#### C2. Cursor-Based Pagination on Timelogs

**Gap**: `GET /timelogs` returns all items for the period. Large timesheets will be slow.

**Files:**

- [MODIFY] `apps/api/src/modules/timelogs/application/timelogs.service.ts` — add `cursor` + `limit` params; use `findMany({ cursor, take })`.
- [MODIFY] `packages/contracts/src/timelogs.ts` — add `nextCursor` to `ListTimeLogsResponseDto`.
- [MODIFY] `apps/client/src/features/timesheet/timesheet-page.tsx` — load-more / infinite scroll in list view.

#### C3. Composite DB Indexes

**Gap**: Timelogs queries filter by `workspaceId + startTime` but there's no composite index.

**Files:**

- [MODIFY] `apps/api/prisma/schema.prisma` — add `@@index([workspaceId, startTime])` on `TimeLog`, `@@index([workspaceId, projectId])` on `TimeLog`.
- [NEW] Prisma migration.

#### C4. E2E Playwright Test Coverage Expansion

**Gap**: Core flows (login → timer → timesheet, admin invite + project) are not covered.

**Files:**

- [NEW] `apps/client/e2e/timer-flow.spec.ts` — login → select project → start timer → stop → verify timesheet entry.
- [NEW] `apps/admin/e2e/invite-flow.spec.ts` — admin invite member → member appears in team page.

---

### Sprint D — New Product Features 🚀

#### D1. Team Activity Feed (Admin)

**What**: A real-time feed in the admin dashboard showing recent time log events: "Alice started tracking Frontend Dev on Project X", "Bob logged 2.5 hrs on Design Review".

**Files:**

- [NEW] endpoint in `apps/api/src/modules/timelogs/interface/http/timelogs.controller.ts` — `GET /timelogs/activity-feed?limit=20` (admin only, across all members).
- [NEW] `apps/admin/src/components/activity-feed.tsx` — scrollable feed with avatars, project color dots, relative timestamps.
- [MODIFY] `apps/admin/src/features/dashboard/dashboard-page.tsx` — add feed in a sidebar panel.

#### D2. Personal Productivity Insights (Client)

**What**: A weekly "Insights" card on the timer page showing trends: best productive day, most-logged project, billable ratio this week vs last week.

**Files:**

- [NEW] `apps/api/src/modules/reporting/application/personal-insights.service.ts` — `GET /reporting/my-insights?weeks=4`.
- [NEW] `apps/client/src/features/timer/productivity-insights.tsx` — sparkline chart + 3 stat tiles.
- [MODIFY] `apps/client/src/features/timer/timer-page.tsx` — render below `<DailyGoalWidget />`.

#### D3. Project Health Score (Admin)

**What**: Each project card in the admin gets a computed "health" score (0–100) based on: budget consumed %, team utilization, days since last log. Color-coded badge.

**Files:**

- [NEW] `apps/api/src/modules/reporting/application/project-health.service.ts` — scoring algorithm.
- [MODIFY] `apps/admin/src/features/projects/projects-page.tsx` — render `<HealthBadge score={...} />` on each project card.

#### D4. Audit Log UI (Admin)

**Gap**: The `TimelogAuditService` and `GET /timelogs/:id/audit-events` endpoint exist and return data. There is a `TimeEntryAuditTrail` component in `packages/ui`. But there is no surface in the admin to browse all audit events workspace-wide.

**Files:**

- [NEW] `apps/admin/src/features/workspace/audit-log-page.tsx` — paginated table of all audit events with filters (user, date, action type).
- [NEW] admin route `/audit`.

---

### Sprint E — Infrastructure & Production Readiness 🏭

#### E1. Structured JSON Logging (API)

**Gap**: The API uses `console.info/error`. No request-ID correlation.

**Files:**

- [NEW] `apps/api/src/common/logger/json-logger.service.ts` — Pino or Winston adapter implementing NestJS `LoggerService`.
- [NEW] `apps/api/src/common/middleware/request-id.middleware.ts` — inject `x-request-id` on every request, propagate through logger context.
- [MODIFY] `apps/api/src/main.ts` — `app.useLogger(new JsonLoggerService())`.

#### E2. Response Caching on Reporting Endpoints

**Gap**: The improvement plan listed `CacheInterceptor` on reporting/billing. `CacheModule` (Redis) is wired but no interceptors applied.

**Files:**

- [MODIFY] `apps/api/src/modules/reporting/interface/reporting.controller.ts` — add `@UseInterceptors(CacheInterceptor)` + `@CacheTTL(60)` on dashboard and budget endpoints.
- [MODIFY] `apps/api/src/modules/billing/interface/billing.controller.ts` — 300 s TTL on billing summary.

#### E3. `pnpm typecheck` CI Gate

**Gap**: `.github/workflows/` exists but PRs don't run typecheck.

**Files:**

- [MODIFY] `.github/workflows/ci.yml` — add `pnpm typecheck` step after lint.

---

## Prioritized Execution Order

| Priority | Sprint                            | Effort | Impact                         |
| -------- | --------------------------------- | ------ | ------------------------------ |
| 🔥       | **A1** Email delivery             | Small  | Completes a half-done feature  |
| 🔥       | **A2** Editable daily goal        | Small  | UX win, closes a glaring gap   |
| 🔥       | **A3** Yesterday summary endpoint | Small  | Completes Sprint 2.6           |
| ⭐       | **B1** Onboarding flow            | Medium | Essential for new users        |
| ⭐       | **B3** Confirm dialog             | Small  | Quality / SSR fix              |
| ⭐       | **B4** Live presence badge        | Small  | Completes admin realtime story |
| 🧱       | **C1** Swagger docs               | Small  | DevEx essential                |
| 🧱       | **C3** DB Indexes                 | Small  | Production perf                |
| 🚀       | **D1** Activity feed              | Medium | High engagement feature        |
| 🚀       | **D2** Productivity insights      | Medium | Differentiating feature        |
| 🚀       | **D4** Audit log UI               | Medium | Closes existing backend        |
| 🏭       | **E1** Structured logging         | Medium | Production observability       |
| 🏭       | **E2** Response caching           | Small  | Production perf                |
| 📦       | **B2** PWA                        | Medium | Mobile reach                   |
| 📦       | **C2** Cursor pagination          | Medium | Scale improvement              |
| 📦       | **D3** Project health score       | Medium | Premium feature                |

---

## Progress Tracking

| ID  | Task                                    | Status  |
| --- | --------------------------------------- | ------- |
| A1  | Email delivery (Nodemailer)             | ✅ Done |
| A2  | Editable daily goal                     | ✅ Done |
| A3  | Yesterday summary endpoint + widget     | ✅ Done |
| B1  | Onboarding flow                         | ✅ Done |
| B2  | PWA support                             | ⬜ TODO |
| B3  | Confirm dialog (replace window.confirm) | ✅ Done |
| B4  | Live presence badge (admin)             | ✅ Done |
| C1  | Swagger / OpenAPI docs                  | ⬜ TODO |
| C2  | Cursor-based pagination                 | ⬜ TODO |
| C3  | Composite DB indexes                    | ⬜ TODO |
| C4  | E2E Playwright tests                    | ⬜ TODO |
| D1  | Team activity feed                      | ⬜ TODO |
| D2  | Personal productivity insights          | ⬜ TODO |
| D3  | Project health score                    | ⬜ TODO |
| D4  | Audit log UI                            | ⬜ TODO |
| E1  | Structured JSON logging                 | ⬜ TODO |
| E2  | Response caching                        | ⬜ TODO |
| E3  | pnpm typecheck CI gate                  | ⬜ TODO |
