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
| Understand the system        | [CONTEXT.md](architecture/CONTEXT.md)                                                              |
| Call the API                 | [api/ROUTES.md](api/ROUTES.md)                                                                     |
| Use the member app           | [user-guides/member/getting-started.md](user-guides/member/getting-started.md)                     |
| Use the admin app            | [user-guides/admin/getting-started.md](user-guides/admin/getting-started.md)                       |
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
- [FRONTEND-UI.md](development/FRONTEND-UI.md) — tables, modals, loaders, toasts
- [SECURITY.md](development/SECURITY.md) — auth, secrets, RBAC
- [architecture/CONTEXT.md](architecture/CONTEXT.md) — system diagram and module boundaries
- [architecture/DOMAIN_MODEL.md](architecture/DOMAIN_MODEL.md) — workspace, project, team hierarchy
- [architecture/DATA_MODEL.md](architecture/DATA_MODEL.md) — Prisma tables and fields
- [architecture/AUTH.md](architecture/AUTH.md) — login, JWT, workspace header
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

| Spec                                         | Module                     |
| -------------------------------------------- | -------------------------- |
| [timer.md](specs/timer.md)                   | Timer engine               |
| [timelogs.md](specs/timelogs.md)             | Time log CRUD              |
| [projects.md](specs/projects.md)             | Projects and team invites  |
| [billing.md](specs/billing.md)               | Hourly rates and summary   |
| [reporting.md](specs/reporting.md)           | Dashboard aggregates       |
| [export.md](specs/export.md)                 | Admin and member exports   |
| [presence.md](specs/presence.md)             | Team live presence         |
| [auth-workspace.md](specs/auth-workspace.md) | Auth and workspace members |
| [user-profile.md](specs/user-profile.md)     | Profile, settings, 2FA     |

## Product direction

- [PRODUCT_ROADMAP.md](architecture/PRODUCT_ROADMAP.md) — planned features by phase
- [FUTURE_SCOPE.md](architecture/FUTURE_SCOPE.md) — deferred platform ideas
- [TIMER_SEQUENCE.md](architecture/TIMER_SEQUENCE.md) — timer sequence diagram

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) at the repository root.

## Keeping docs current

When you ship a feature: update the spec in `docs/specs/`, link it from [PRODUCT_ROADMAP.md](architecture/PRODUCT_ROADMAP.md), and add an entry to CHANGELOG. See [CONTRIBUTING.md](development/CONTRIBUTING.md#documentation-hygiene).
