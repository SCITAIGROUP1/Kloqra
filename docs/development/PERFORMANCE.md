# Performance

## Bundle analysis

After `pnpm install`, analyze production chunks:

```bash
pnpm --filter @kloqra/admin analyze
pnpm --filter @kloqra/client analyze
```

Open the generated HTML reports under `apps/*/`.next/analyze/`. Re-run after changing heavy dependencies (e.g. `recharts`) or route-level `next/dynamic` splits.

### Recorded baseline (2026-06-13)

Re-run after major dependency or route changes and update this table.

**Client — First Load JS (Next build table, gzip estimate)**

| Route                    | Page size | First Load JS | Notes                                                             |
| ------------------------ | --------- | ------------- | ----------------------------------------------------------------- |
| `/dashboard`             | 31.1 kB   | **275 kB**    | Route + all widgets lazy via `widgets-lazy.tsx`                   |
| `/timesheet`             | 7.65 kB   | **252 kB**    | Route + calendar/month/dialog lazy via `timesheet-lazy.tsx`       |
| `/time-tracker`          | 8.16 kB   | **252 kB**    | Route + week list/dialog lazy via `time-tracker-lazy.tsx`         |
| `/timer`                 | 5.3 kB    | **247 kB**    | Route + goal/quick-actions/stale dialog lazy via `timer-lazy.tsx` |
| `/submissions`           | 2.21 kB   | **237 kB**    | Route + status cards lazy via `submissions-lazy.tsx`              |
| `/projects/.../overview` | 1.32 kB   | **243 kB**    | Route dynamic + charts lazy in `project-overview-charts-lazy.tsx` |
| `/login`                 | 1.47 kB   | 233 kB        | Baseline authenticated shell                                      |
| Shared by all routes     | —         | 103 kB        |                                                                   |

**Admin — `/dashboard`:** 142 kB page shell, **384 kB** First Load JS (was 404 kB; widgets lazy via `widgets-lazy.tsx`).

**Client — dashboard raw JS budget:** 931 KB / 1450 KB gate (`pnpm check:bundle-budget`).

**Client — largest on-disk chunks** (under `apps/client/.next/static/chunks/`):

| Chunk            | ~Size  | Likely contents                            |
| ---------------- | ------ | ------------------------------------------ |
| `9051-*.js`      | 480 KB | Shared vendor graph (recharts, grid, etc.) |
| `framework-*.js` | 185 KB | React / Next runtime                       |
| `1461-*.js`      | 169 KB | Shared app chunk                           |
| `9db29056-*.js`  | 169 KB | Shared app chunk                           |

**Lazy splits confirmed** (`react-loadable-manifest.json`): client dashboard widgets, timesheet calendar/month/dialog, submissions status cards, time-tracker week list/dialog, timer widgets, admin dashboard widgets, and project overview charts load in separate chunks on demand.

## Turbo / CI cache

- Root [`turbo.json`](../../turbo.json): `lint` and `typecheck` no longer wait on `^build` (faster local/CI typecheck when packages are unchanged).
- Package [`turbo.json`](../../packages/ui/turbo.json) files for `@kloqra/ui`, `@kloqra/web-shared`, and `@kloqra/contracts` declare explicit `inputs`/`outputs` for better cache hits.
- **Remote cache (team):** `TURBO_TOKEN` / `TURBO_TEAM` are wired in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). Link locally with `npx turbo link`.
- **CI bundle gate:** `quality` job runs `node scripts/check-bundle-budget.mjs` after `pnpm build`.
- GitHub Actions Turborepo cache uses `pnpm-lock.yaml` + branch ref (not commit SHA alone) for better restore hits.

```bash
npx turbo link
# Set TURBO_TOKEN / TURBO_TEAM in CI (GitHub Actions secrets)
```

**Dev startup (measure locally):**

```bash
# Cold (bootstrap + package builds + apps)
/usr/bin/time -p pnpm dev:once

# Warm (apps only, deps already running)
/usr/bin/time -p pnpm dev:apps
```

Target: warm `dev:apps` under ~30s after first bootstrap.

**Pre-PR timing (measure locally):**

```bash
/usr/bin/time -p pnpm test:prepr
```

### Baseline checklist

Before optimizing, capture:

1. Top client chunks from `analyze` (expect `recharts`, `react-grid-layout`, dashboard feature, `@kloqra/ui`, `@kloqra/web-shared`).
2. Cold vs warm dev startup: `pnpm dev:once` (full bootstrap) vs `pnpm dev:apps` (apps only, after deps are up).
3. Pre-PR segment timing: `pnpm test:prepr` (lint/typecheck, unit tests, builds, e2e).

### Bundle budget gate

After a client production build:

```bash
pnpm --filter @kloqra/client exec next build
pnpm check:bundle-budget
```

Default budget: **1450 KB** raw on-disk JS for the dashboard route (page + layout chunks). Next's build table shows a smaller gzip estimate (~400 KB). Override with `BUNDLE_BUDGET_DASHBOARD_BYTES`.

## Local dev workflow

| Command                      | When to use                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm dev:once` / `pnpm dev` | First run of the day — bootstrap DB, build packages, start api + client + admin                 |
| `pnpm dev:apps`              | Daily iteration — skip bootstrap when Postgres/Redis and package builds are already ready       |
| `pnpm dev:shared`            | Watch `@kloqra/contracts`, `@kloqra/ui`, and `@kloqra/web-shared` while editing shared packages |

Client and admin use **Turbopack** in dev (`next dev --turbo`).

## API guardrails

- Report, export, and billing date ranges are capped at **366 days** (contracts validation).
- `GET /timelogs` returns `{ items, nextCursor? }` with default `limit` 500 and a 90-day lookback when `from`/`to` are omitted.
- Admin dashboard responses may be cached in Redis for 120s; cache is invalidated on time log and hourly rate writes.

## Database & Background Queue Optimizations

- **N+1 Query Resolution**: `listOccupancy` batch-fetches project settings and workspace settings, computing and querying all corresponding `TimesheetPeriod` statuses in exactly 2 query segments instead of N queries.
- **Redis Batching**: `activeCount` and `assertNoActiveTimerAnywhere` utilize Redis `mget` to check timer states for all members/workspaces in a single network round-trip.
- **Index Optimization for Last Logs**: `buildUsersWithoutTime` utilizes PostgreSQL `DISTINCT ON` via Prisma's `distinct: ['userId']` and compound `orderBy` configurations, fetching exactly one row per user using the compound index `@@index([userId, startTime])`.
- **Export Queueing via BullMQ**: Asynchronous data export jobs are enqueued onto the dedicated `export-queue` via BullMQ, offloading file processing from the web API thread. Expired job cleanups are scheduled once daily at 4 AM via `@Cron` instead of a 5-second `setInterval` database polling loop.
- **Batch Team Lookups**: Project team member resolutions in the export module query all projects concurrently using the batch helper `teamMembersUserIds` rather than loops or parallel mapping.

## Frontend patterns

- Admin dashboard route and **all** dashboard widgets load via `widgets-lazy.tsx` (charts already via `charts-lazy.tsx`).
- Project overview charts lazy via `project-overview-charts-lazy.tsx` in `@kloqra/web-shared` (client + admin overview tabs).
- Client project overview route uses `next/dynamic` in [`overview/page.tsx`](<../../apps/client/src/app/(workspace)/projects/[projectId]/overview/page.tsx>).
- Client dashboard route and **all** dashboard widgets load via `widgets-lazy.tsx`; `react-grid-layout` CSS is scoped to dashboard layouts only.
- Timesheet route splits via `timesheet-lazy.tsx` (`TimesheetCalendar`, `TimesheetMonth`, `TimeEntryDialog`); draft helpers live in `time-entry-draft.ts` so other routes do not pull the dialog UI.
- Submissions route splits via `submissions-lazy.tsx` (`SubmissionStatusCard` with submit/amendment dialogs).
- Time tracker route splits via `time-tracker-lazy.tsx` (`TimeTrackerWeekList`, reuses `TimeEntryDialog` from `timesheet-lazy.tsx`).
- Timer route splits via `timer-lazy.tsx` (`DailyGoalWidget`, `QuickActions`, `StaleTimerDialog`).
- Motion components lazy-load `motion/react` after mount (CSS fallback on first paint).
- `experimental.optimizePackageImports` in both Next apps: `lucide-react`, `recharts`, `@radix-ui/react-*`, `motion/react`, `react-grid-layout`.
- Charts import from `@kloqra/ui/chart` (separate export) rather than the main UI barrel when possible.
- `@kloqra/web-shared` is prebuilt to `dist/` via `tsc` (preserves `"use client"` boundaries, like `@kloqra/ui`) to reduce Next compile work.
