# Kloqra documentation

Start here for architecture, development, API reference, feature specs, user guides, and operations.

## Quick links

| I want to…                   | Go to                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| Run the app locally          | [Root README](../README.md)                                                                        |
| Set up environment variables | [ENVIRONMENT.md](development/ENVIRONMENT.md) (local DB: `kloqra`, seed: `@kloqra.dev`)             |
| Contribute code              | [CONTRIBUTING.md](../CONTRIBUTING.md)                                                              |
| Build frontend features      | [FRONTEND-UI.md](development/FRONTEND-UI.md)                                                       |
| Run tests                    | [TESTING.md](development/TESTING.md) · [QA guide (non-technical)](user-guides/qa/testing-guide.md) |
| Understand the system        | [CONTEXT.md](architecture/CONTEXT.md) · [PERFORMANCE.md](development/PERFORMANCE.md)               |
| Timesheet approval workflow  | [timesheet-submissions-and-approval.md](user-guides/timesheet-submissions-and-approval.md)         |
| Realtime notifications       | [specs/notifications-realtime.md](specs/notifications-realtime.md)                                 |
| Call the API                 | [api/ROUTES.md](api/ROUTES.md)                                                                     |
| Connect as external client   | [api/public-reporting-client-guide.md](api/public-reporting-client-guide.md)                       |
| Issue API keys (admin)       | [user-guides/admin/public-reporting-api.md](user-guides/admin/public-reporting-api.md)             |
| Use the member app           | [user-guides/member/getting-started.md](user-guides/member/getting-started.md)                     |
| Use the admin app            | [user-guides/admin/getting-started.md](user-guides/admin/getting-started.md)                       |
| **40-min technical demo**    | [user-guides/demo-40min-script.md](user-guides/demo-40min-script.md)                               |
| **Demo slide deck (PDF)**    | [presentations/kloqra-demo-and-roadmap.pdf](presentations/kloqra-demo-and-roadmap.pdf)             |
| Deploy to staging            | [runbooks/deploy.md](runbooks/deploy.md)                                                           |
| Deploy API (Railway)         | [runbooks/railway.md](runbooks/railway.md)                                                         |
| Deploy frontends (Vercel)    | [runbooks/vercel.md](runbooks/vercel.md)                                                           |
| Fix local dev issues         | [runbooks/local-troubleshooting.md](runbooks/local-troubleshooting.md)                             |
| Work with AI agents          | [agent/AGENTS.md](agent/AGENTS.md)                                                                 |

## By audience

### Developer

- [CONTRIBUTING.md](../CONTRIBUTING.md) — monorepo layout, contract-first workflow, pre-commit hooks
- **Architecture (target):** API slices under `apps/api/src/modules/` + shared `common/time/`; Next.js apps use `features/` + `@kloqra/web-shared`
- [ENVIRONMENT.md](development/ENVIRONMENT.md) — all environment variables
- [TESTING.md](development/TESTING.md) — unit and e2e tests
- [FRONTEND-UI.md](development/FRONTEND-UI.md) — tables, modals, loaders, toasts, realtime sync
- [PERFORMANCE.md](development/PERFORMANCE.md) — bundle budgets and lazy-loading
- [SECURITY.md](development/SECURITY.md) — auth, secrets, RBAC
- [architecture/CONTEXT.md](architecture/CONTEXT.md) — system diagram and module boundaries
- [architecture/DOMAIN_MODEL.md](architecture/DOMAIN_MODEL.md) — workspace, project, team hierarchy
- [architecture/DATA_MODEL.md](architecture/DATA_MODEL.md) — Prisma tables and fields
- [architecture/DATABASE_PARTITIONING.md](architecture/DATABASE_PARTITIONING.md) — partitioned time logs and audit events
- [architecture/AUTH.md](architecture/AUTH.md) — login, JWT, workspace header
- [architecture/ci-cd-pipeline.md](architecture/ci-cd-pipeline.md) — CI/CD workflow and deploy gates
- [api/OVERVIEW.md](api/OVERVIEW.md) — API conventions
- [api/ROUTES.md](api/ROUTES.md) — endpoint catalog
- Per-app READMEs: [apps/api](../apps/api/README.md), [apps/client](../apps/client/README.md), [apps/admin](../apps/admin/README.md)
- Package READMEs: [packages/ui](../packages/ui/README.md), [packages/web-shared](../packages/web-shared/README.md)

### User (member or admin)

- [user-guides/README.md](user-guides/README.md) — which guide to read
- Member (client app): [user-guides/member/](user-guides/member/)
- Admin app: [user-guides/admin/](user-guides/admin/)
- QA / manual testing: [user-guides/qa/testing-guide.md](user-guides/qa/testing-guide.md)

### Ops

- [runbooks/deploy.md](runbooks/deploy.md) — staging/production deployment hub
- [runbooks/railway.md](runbooks/railway.md) — API, Postgres, Redis on Railway
- [runbooks/vercel.md](runbooks/vercel.md) — client and admin on Vercel
- [deploy/](../deploy/) — env templates and deploy scripts
- [runbooks/local-troubleshooting.md](runbooks/local-troubleshooting.md) — common local failures

### Agent / process

- [agent/AGENTS.md](agent/AGENTS.md) — execution order and role bounds
- [agent/ROC.md](agent/ROC.md) — record of changes
- [TASK_BOARD.json](../TASK_BOARD.json) — task status

## Feature specs

Canonical behavior for shipped features (read before implementing changes):

| Spec                                                         | Module                                  |
| ------------------------------------------------------------ | --------------------------------------- |
| [timer.md](specs/timer.md)                                   | Timer engine (pause, resume, auto-stop) |
| [timelogs.md](specs/timelogs.md)                             | Time log CRUD, recurrence, audit        |
| [submissions.md](specs/submissions.md)                       | Timesheet submit / approve workflow     |
| [projects.md](specs/projects.md)                             | Projects, tasks, team invites, colors   |
| [categories.md](specs/categories.md)                         | Categories and bulk import              |
| [billing.md](specs/billing.md)                               | Hourly rates and summary                |
| [reporting.md](specs/reporting.md)                           | Dashboard aggregates                    |
| [export.md](specs/export.md)                                 | Admin and member exports, async jobs    |
| [presence.md](specs/presence.md)                             | Team live presence                      |
| [auth-workspace.md](specs/auth-workspace.md)                 | Auth and workspace members              |
| [user-profile.md](specs/user-profile.md)                     | Profile, settings, 2FA                  |
| [global-search.md](specs/global-search.md)                   | Admin command palette                   |
| [notifications-realtime.md](specs/notifications-realtime.md) | WebSocket bell + live data sync         |
| [assistant.md](specs/assistant.md)                           | Member help assistant                   |

## Product direction

- [KLOQRA_FUTURE_PLAN.md](architecture/KLOQRA_FUTURE_PLAN.md) — **master roadmap** 2026–2027 (H0–H4)
- [PRODUCT_ROADMAP.md](architecture/PRODUCT_ROADMAP.md) — shipped vs planned feature list
- [FUTURE_SCOPE.md](architecture/FUTURE_SCOPE.md) — deferred platform ideas
- [TIMER_SEQUENCE.md](architecture/TIMER_SEQUENCE.md) — timer sequence diagram

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) at the repository root.

## Keeping docs current

When you ship a feature: update the spec in `docs/specs/`, link it from [PRODUCT_ROADMAP.md](architecture/PRODUCT_ROADMAP.md), and add an entry to [CHANGELOG.md](../CHANGELOG.md).
