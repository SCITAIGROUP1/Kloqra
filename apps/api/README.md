# Kloqra API

NestJS application — sole write path to PostgreSQL and Redis (timer state, pub/sub, BullMQ).

## Commands

```bash
# From repo root
pnpm --filter @kloqra/api dev
pnpm prisma:migrate
pnpm prisma:seed
pnpm --filter @kloqra/api test
pnpm --filter @kloqra/api test:e2e
```

## Environment

See [docs/development/ENVIRONMENT.md](../../docs/development/ENVIRONMENT.md). Copy `.env.example` to `.env`.

Local database name: **`kloqra`** (`createdb kloqra`). After `pnpm prisma:seed`: `admin@kloqra.dev` / `member@kloqra.dev`, password `password123` (primary workspace: **Acme Corporation**).

Default URL: http://localhost:3001

## Modules

| Module           | Path                        | Responsibility                                      |
| ---------------- | --------------------------- | --------------------------------------------------- |
| health           | `modules/health/`           | `GET /health`                                       |
| auth             | `modules/auth/`             | Register, login, refresh, logout, me                |
| users            | `modules/users/`            | Profile, preferences, 2FA, sessions                 |
| workspace        | `modules/workspace/`        | Workspace list, members, invites, settings          |
| projects         | `modules/projects/`         | Projects, teams, team invites                       |
| tasks            | `modules/tasks/`            | Tasks per project (incl. common tasks)              |
| categories       | `modules/categories/`       | Categories, bulk import (BullMQ)                    |
| timelogs         | `modules/timelogs/`         | Time log CRUD, audit, timesheet submissions         |
| timer            | `modules/timer/`            | Start/stop/pause/resume timer (Redis or memory)     |
| billing          | `modules/billing/`          | Hourly rates, billing summary                       |
| reporting        | `modules/reporting/`        | Dashboard, utilization, widget shares               |
| presence         | `modules/presence/`         | Team live snapshot and SSE stream                   |
| export           | `modules/export/`           | Admin/member exports, async jobs, schedules         |
| notifications    | `modules/notifications/`    | In-app inbox, WebSocket gateway, Redis fan-out      |
| assistant        | `modules/assistant/`        | Proxy to `apps/assistant-api` for member chat       |
| jira             | `modules/jira/`             | Jira Cloud credentials and issue linking            |
| public-reporting | `modules/public-reporting/` | API-key scoped reporting for external clients       |
| queues           | `modules/queues/`           | BullMQ workers (export, bulk category, bulk invite) |

Each module follows: `application/`, `interface/http/`, optional `interface/ws/`, `infrastructure/`.

**Partitioned tables:** `time_logs`, `time_log_audit_events` — see [DATABASE_PARTITIONING.md](../../docs/architecture/DATABASE_PARTITIONING.md).

## Contracts

DTOs and routes: `packages/contracts`. Controllers import `ROUTES` and Zod schemas from `@kloqra/contracts`.

## Documentation

- [API routes](../../docs/api/ROUTES.md)
- [Feature specs](../../docs/specs/)
- [Architecture](../../docs/architecture/CONTEXT.md)
