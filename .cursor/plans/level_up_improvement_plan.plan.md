# ChronoMint — Level-Up Improvement Plan (Completed)

ChronoMint is a production-quality time-analytics monorepo (NestJS API, Next.js 15 Client + Admin,
Tailwind v4, Prisma/Postgres, Redis). The baseline feature set (Phases 1–2) is fully shipped.
This plan proposes improvements across **five dimensions**: Security Hardening, Product Features,
UX/UI Polish, Developer Experience, and Production Readiness.

---

## Execution Order (Sprints)

| Sprint | Dimension  | Key Deliverables                                               | Status    |
| ------ | ---------- | -------------------------------------------------------------- | --------- |
| **1**  | Security   | Rate limiting, Helmet, Refresh token rotation, env validation  | Completed |
| **2**  | Features   | Budget burn-down, Workspace settings, Daily goal widget        | Completed |
| **3**  | Features   | Utilization report, Invoice generation                         | Completed |
| **4**  | UX         | Animated timer, Toast system, Empty states, Keyboard shortcuts | Completed |
| **5**  | Features   | Timesheet submit/approve workflow                              | Completed |
| **6**  | DevEx      | OpenAPI docs, Structured logging, Test coverage expansion      | Completed |
| **7**  | Production | Health check, Graceful shutdown, Sentry, Docker hardening      | Completed |
| **8**  | Features   | Email delivery for schedules, Quick actions, PWA               | Partial   |

---

## Dimension 1 — Security Hardening 🔒

### 1.1 Rate Limiting on Auth Endpoints

**Why**: Login brute-force and credential-stuffing attacks are trivial against unprotected endpoints.
Currently there is no rate limiting.

**Files:**

- MODIFY `apps/api/src/main.ts` — add `@nestjs/throttler`, `ThrottlerGuard` globally;
  5 req/60 s on `/auth/login` and `/auth/register`.
- NEW `apps/api/src/common/guards/throttle-override.guard.ts` — per-route override decorator.

### 1.2 Helmet HTTP Security Headers

**Why**: No security headers currently set (X-Frame-Options, CSP, HSTS, etc.).

**Files:**

- MODIFY `apps/api/src/main.ts` — `app.use(helmet())` with CSP.

### 1.3 Refresh Token Rotation + Revocation

**Why**: Current refresh tokens are stateless JWTs with no revocation. A stolen token stays valid
for 7 days.

**Files:**

- MODIFY `apps/api/prisma/schema.prisma` — add `RefreshToken` model.
- MODIFY `apps/api/src/modules/auth/application/auth.service.ts` — persist hashed token, rotate
  on use, revoke on logout.

### 1.4 Input Validation on All Routes

**Why**: Some endpoints accept raw JSON without Zod validation.

**Files:**

- MODIFY all module controllers — audit every `@Body()` usage, add `ZodValidationPipe`.
- Add global `ValidationPipe` as fallback in `main.ts`.

### 1.5 Startup Environment Variable Validation

**Why**: Missing env vars cause cryptic runtime failures rather than a clear startup error.

**Files:**

- MODIFY `apps/api/src/load-env.ts` — Zod schema validating all required env vars; exit(1) with
  clear diff of missing keys.

### 1.6 Audit Log (Phase C)

**Why**: Production SaaS needs an immutable record of sensitive actions.

**Files:**

- NEW `apps/api/src/modules/audit/` — `AuditLog` Prisma model + `@Audit()` decorator.

---

## Dimension 2 — Product Features 🚀

### 2.1 Budget Burn-Down Widget (Admin — Phase B)

`budgetHours` exists on `Project` but is never surfaced.

**Files:**

- NEW `apps/api/src/modules/reporting/application/budget.service.ts`
- NEW `apps/admin/src/features/dashboard/budget-burndown-widget.tsx`
  - Recharts radial/bar chart; color-coded: green < 70 %, amber 70–90 %, red > 90 %.

### 2.2 Invoice Generation (Admin — Phase B)

Direct ROI — PDF invoices from billable time. `pdfkit` already installed.

**Files:**

- NEW `apps/api/src/modules/export/application/invoice.service.ts`
- NEW `apps/admin/src/features/exports/invoice-wizard.tsx` — 3-step wizard.

### 2.3 Utilization Report (Admin — Phase B)

Member × week logged vs. expected hours.

**Files:**

- MODIFY `apps/api/src/modules/reporting/application/reporting.service.ts`
- NEW `apps/admin/src/features/dashboard/utilization-heatmap.tsx` — GitHub-style heatmap.

### 2.4 Timesheet Submit / Approve Workflow (Client + Admin — Phase C)

Core accountability loop.

**Files:**

- MODIFY `apps/api/prisma/schema.prisma` — add `TimesheetPeriod` model.
- NEW `apps/api/src/modules/timelogs/application/timesheet-workflow.service.ts`
- NEW Client UI — Submit button on timesheet page.
- NEW Admin UI — Pending submissions queue.

### 2.5 Personal Goals & Daily Targets (Client — Nice)

**Files:**

- MODIFY `packages/contracts/src/workspace-settings.ts` — add `dailyTargetHours`.
- NEW `apps/client/src/features/timer/daily-goal-widget.tsx` — circular progress ring.

### 2.6 Quick Actions (Client — Nice)

**Files:**

- NEW `apps/api/src/modules/timelogs/interface/http` — `GET /timelogs/yesterday-summary`.
- NEW `apps/client/src/features/timer/quick-actions.tsx`.

### 2.7 Scheduled Export Email Delivery (Admin — Phase D)

`ExportSchedule` is fully modelled; email delivery is not wired.

**Files:**

- NEW `apps/api/src/modules/export/application/schedule-runner.service.ts` — `@Cron` job.

### 2.8 Workspace Settings UI (Admin — Phase B/C)

`Workspace.settings` JSON has no edit UI.

**Files:**

- NEW `apps/admin/src/features/settings/workspace-settings-page.tsx`

---

## Dimension 3 — UX / UI Polish ✨

### 3.1 Timer — Keyboard Shortcut & Browser Tab Title

- `Space` / `Ctrl+Shift+T` → start/stop.
- `document.title` shows `⏱ 01:23:45 — ChronoMint` when tracking.
- MODIFY `apps/client/src/features/timer/timer-page.tsx`.

### 3.2 Timer — Animated Clock Face

- SVG circular progress ring advancing each second (full = 1 h).
- Pulse glow on primary color when active.
- MODIFY `apps/client/src/features/timer/timer-page.tsx`.

### 3.3 Timesheet — Inline Edit

- Click duration cell → inline time-picker.
- Tab/Escape navigation.

### 3.4 Toast Notification System

- NEW `packages/ui/src/components/toaster.tsx` — Sonner-based.
- Success toasts on timer start/stop, log save/delete, export.

### 3.5 Empty States with Illustrations

- NEW `packages/ui/src/components/empty-state.tsx`.
- Apply on timer, timesheet, projects, tasks, admin team pages.

### 3.6 Mobile / PWA Support

- MODIFY `apps/client/next.config.ts` — add `next-pwa`.
- Responsive sidebar → bottom tab bar on mobile.

### 3.7 Onboarding Flow

- NEW `apps/client/src/features/onboarding/` — step-through overlay, shown once.

---

## Dimension 4 — Developer Experience 🛠️

### 4.1 Unit Test Coverage Expansion

Target: `timer.service`, `auth.service`, `billing.service`, `reporting.service`.

### 4.2 E2E Test Suite Expansion

New Playwright flows: login→timer→timesheet, admin project+invite, export CSV.

### 4.3 OpenAPI / Swagger Documentation

- MODIFY `apps/api/src/main.ts` — `@nestjs/swagger`, serve at `/api/docs`.

### 4.4 Structured Logging

- NEW `apps/api/src/common/logger/` — JSON logger with requestId correlation.

### 4.5 Database Query Optimization

- Cursor-based pagination on timelogs `findAll`.
- Move heavy aggregations to `$queryRaw`.
- Add composite indexes.

### 4.6 CI Pipeline Enhancement

- MODIFY `.github/workflows/` — test + typecheck + lint gates on PRs.

---

## Dimension 5 — Production Readiness 🏭

### 5.1 Health Check Expansion

- MODIFY `apps/api/src/modules/health/` — DB ping + Redis PING + uptime + version.

### 5.2 Graceful Shutdown

- MODIFY `apps/api/src/main.ts` — `enableShutdownHooks()`, flush active timers on SIGTERM.

### 5.3 Error Monitoring (Sentry)

- NEW `apps/api/src/common/http/sentry-filter.ts`.
- Instrument Next.js apps via `@sentry/nextjs`.

### 5.4 Performance: Response Caching

- Apply `CacheInterceptor` on reporting/billing controllers (CacheModule already exists).
- Dashboard 60 s TTL, billing summary 5 min TTL.

### 5.5 Docker Multi-Stage Hardening

- MODIFY `apps/api/Dockerfile` — multi-stage build, non-root `node` user, `HEALTHCHECK`.

---

## Verification Plan

### Automated Tests

```bash
pnpm test          # Vitest unit — all apps + packages
pnpm test:e2e      # Playwright e2e flows
pnpm typecheck     # TypeScript strict compile
pnpm lint          # ESLint + Prettier
```

### Manual Verification

- `pnpm serve` — confirm all pages render.
- Verify rate limiter blocks 6th login attempt within 60 s.
- PDF invoice download works end-to-end.
- Swagger UI at `http://localhost:3001/api/docs`.
