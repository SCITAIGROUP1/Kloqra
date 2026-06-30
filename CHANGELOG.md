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

- **Realtime notifications:** Socket.IO `/notifications` namespace pushes `notification.created`; scoped workspace cache invalidation (`submissions`, `timesheet`, `projects`, `tasks`, `pending_approvals`) via `@kloqra/web-shared`. Spec: `docs/specs/notifications-realtime.md`.
- **Timesheet submissions (client):** Redesigned `/submissions` page with filters, status tabs, and amendment flows. Spec: `docs/specs/submissions.md`.
- **Approval policy hardening:** Hours-only draft rows, WAIVED status on settings change, ordered submit with cascade preview, required reject notes.
- **Database partitioning:** Monthly `time_logs` and yearly `time_log_audit_events` range partitions. Guide: `docs/architecture/DATABASE_PARTITIONING.md`.
- **BullMQ export jobs:** Large exports run asynchronously with job polling and download endpoints.
- **Bulk category import:** Excel template, upload, and JSON bulk API with background worker.
- **Project custom colors:** Curated palette plus custom hex on create/edit; member display color override.
- **Common tasks:** Workspace-wide tasks (`isCommon`) assignable to any member; deletion preserves logged time via uncategorized fallback.
- **Recurring time entries:** `POST /timelogs/batch` with `daily` / `weekdays` / `weekly` recurrence from the time-entry dialog.
- **Timer enhancements:** Pause/resume, discard, stale auto-stop, active-timer count for admin team live.
- **Time tracker:** Day-tab week view with week-based pagination at `/time-tracker`.
- **Admin export UX:** Custom export reset filters, improved preset flows.
- **Jira workspace redesign** and bulk member provisioning improvements.
- **CI/CD:** Pipeline architecture guide (`docs/architecture/ci-cd-pipeline.md`); Turborepo remote cache; conditional DB migrate on deploy.
- **Paginated list APIs:** `GET /projects`, `/tasks`, `/categories`, `/billing/rates`, `/projects/:id/team`, `/workspaces/:id/members/overview`, `/reporting/utilization` return `{ items, page, limit, total, totalPages }` with optional `search`.
- **Shared data tables:** `DataTableCard`, `TableToolbar`, `TablePagination`, `TableLoadingState` in `@kloqra/ui`; `usePaginatedList` in `@kloqra/web-shared`.
- **Modal system:** `AppModal`, shared `Dialog`/`ConfirmDialog` styling (accent bar, overlay blur, icon badges).
- **Loading & feedback:** `Spinner`, `CenteredLoader`, skeleton table rows; Sonner toasts on CRUD, exports, timesheet submit, workspace switch, and security actions.
- **User profile & settings:** `/profile` and `/settings` in both apps via `@kloqra/web-shared` (2FA, sessions, preferences). Spec: `docs/specs/user-profile.md`.
- **Dedicated approvals:** Admin `/approvals` and member `/approvals` for timesheet submission workflow.
- **Member dashboard:** Configurable widget layout with arrange mode and save-as-default.
- **Time tracker:** Week-grouped entry list at `/time-tracker`.
- **Documentation:** `docs/development/FRONTEND-UI.md`, `packages/web-shared/README.md`, updated API pagination docs and user guides.
- Deployment infrastructure: Railway config ([`railway.toml`](railway.toml)), deploy scripts ([`scripts/deploy/`](scripts/deploy/)), env templates ([`deploy/`](deploy/)), deploy CI workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)), and runbooks ([`docs/runbooks/railway.md`](docs/runbooks/railway.md)).
- Complete documentation set under `docs/` (hub, development guides, architecture, API reference, feature specs, user guides, runbooks).
- **Real email delivery**: `MailerService` wired into scheduled exports.
- **Editable daily goal** and **Yesterday Summary** on client timer.
- **Confirm dialog** and **Live Presence Badge** on admin dashboard.

### Changed

- **Kloqra rebrand:** product name, `@kloqra/*` packages, design tokens, and UI copy across client, admin, and API touchpoints.
- **Local/CI database:** default Postgres database renamed from `chronomint` to `kloqra` (CI test DB: `kloqra_test`). Update `apps/api/.env` and recreate or migrate your local DB when upgrading.
- **Seed data:** demo accounts use `@kloqra.dev`; primary workspace is **Acme Corporation** (`slug: acme`). Run `pnpm prisma:seed` after DB reset.

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

- Monorepo scaffold: NestJS API, Next.js client and admin, `@kloqra/contracts`, `@kloqra/ui`.
- Auth (JWT + refresh cookies), workspace RBAC.
- Projects, tasks, team invites.
- Timer engine (Redis or in-memory).
- Time log CRUD (manual + timer).
- Prisma schema, migrations, and seed data.
- Client: timer, timesheet, projects, tasks.
- Deploy runbook and agent playbook.

[Unreleased]: https://github.com/SCITAIGROUP1/Kloqra/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/SCITAIGROUP1/Kloqra/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/SCITAIGROUP1/Kloqra/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/SCITAIGROUP1/Kloqra/releases/tag/v0.1.0
