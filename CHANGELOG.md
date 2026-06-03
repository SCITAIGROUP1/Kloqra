# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Deployment infrastructure: Railway config ([`railway.toml`](railway.toml)), deploy scripts ([`scripts/deploy/`](scripts/deploy/)), env templates ([`deploy/`](deploy/)), API migrate CI workflow ([`.github/workflows/deploy-api.yml`](.github/workflows/deploy-api.yml)), and runbooks ([`docs/runbooks/railway.md`](docs/runbooks/railway.md)).
- Complete documentation set under `docs/` (hub, development guides, architecture, API reference, feature specs, user guides, runbooks).

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
