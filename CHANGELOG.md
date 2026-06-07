# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3.0] - 2026-06-06

### Added

- **Security Hardening**: Global rate limiting on sensitive routes, Helmet HTTP security headers, database-backed refresh token rotation/revocation, and strict startup environment variable Zod validation schema.
- **Finance & Ops Features**: Budget burn-down calculations and radial widget, weekly team utilization report API and heatmap, custom PDF Invoice Generator API, and multi-step Invoice Wizard under the Exports panel.
- **UX & UI Polish**: Keyboard shortcuts (`Space`, `Ctrl+Shift+T`), browser tab title sync for active timers, animated SVG clock ring, Daily Goal widget, global Sonner toast notifications, and unified Empty State illustrations.
- **Workflow Features**: Database-backed timesheet submit/approve status workflow, client submit button, client editing lockouts, and a pending timesheet approvals queue on the admin Team page.
- **Production Readiness**: Alpine Docker non-root (`USER node`) configuration with native Node.js HTTP health checks, Redis-backed billing summary response caching, and client & server-side Sentry error monitoring filters.
- **Developer Experience**: Expanded unit test coverage including mock auth service tests.

## [Unreleased]

### Added

- Deployment infrastructure: Railway config ([`railway.toml`](railway.toml)), deploy scripts ([`scripts/deploy/`](scripts/deploy/)), env templates ([`deploy/`](deploy/)), API migrate CI workflow ([`.github/workflows/deploy-api.yml`](.github/workflows/deploy-api.yml)), and runbooks ([`docs/runbooks/railway.md`](docs/runbooks/railway.md)).
- Complete documentation set under `docs/` (hub, development guides, architecture, API reference, feature specs, user guides, runbooks).
- **A1 — Real email delivery**: `MailerService` (Nodemailer, SMTP env vars) wired into `ExportScheduleService`; scheduled exports now email the generated file as an attachment. Graceful no-op when `SMTP_HOST` is unset.
- **A2 — Editable daily goal**: `DailyGoalWidget` now reads `dailyTargetHours` from workspace settings and exposes an inline pencil-icon edit. Admin workspace settings form has a new "Daily Target Hours" field that persists to the workspace `settings` JSON.
- **A3 — Yesterday Summary**: `GET /timelogs/yesterday-summary` endpoint returning `totalSec`, `billableSec`, `topTask`, `logCount`. Quick Actions panel shows a summary strip above favorites/recents when the user has logs from yesterday.
- **B3 — Confirm dialog**: Replaced blocking `window.confirm` on timesheet delete with a Radix `AlertDialog`-backed `ConfirmDialog` component exported from `@chronomint/ui`.
- **B4 — Live Presence Badge**: `<LivePresenceBadge>` component added to the admin dashboard header; polls `/presence/snapshot` every 30 s and renders an animated green pulsing dot with member count.

## [0.2.0] - 2025-06-02

### Added

- **Admin:** Multi-report export wizard (CSV, Excel, PDF) with filters and column picker.
- **Admin:** Dashboard analytics, team live presence, billing rates and summary.
- **Admin:** Project and team invite management.
- **Client:** Member timesheet export and personal week summary.
- **API:** Export module with shared time aggregation with reporting.
- **API:** Billing, reporting, and presence (SSE) modules.

## [0.1.0] - 2025-06-02

### Added

- Monorepo scaffold: NestJS API, Next.js client and admin, `@chronomint/contracts`, `@chronomint/ui`.
- Auth (JWT + refresh cookies), workspace RBAC.
- Projects, tasks, team invites.
- Timer engine (Redis or in-memory).
- Time log CRUD (manual + timer).
- Prisma schema, migrations, and seed data.
- Client: timer, timesheet, projects, tasks.
- Deploy runbook and agent playbook.

[Unreleased]: https://github.com/your-org/chronomint/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/your-org/chronomint/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/your-org/chronomint/releases/tag/v0.1.0
