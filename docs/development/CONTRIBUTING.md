# Contributing to Kloqra

## Prerequisites

- Node.js 20+
- pnpm 9 (`corepack enable` or `npm i -g pnpm@9`)
- **Docker path:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Postgres + Redis in containers)
- **Native path:** PostgreSQL 16+ on port 5432 ([Postgres.app](https://postgresapp.com/) on Mac); optional Redis 7+ on 6379 (or `REDIS_USE_MEMORY=true` for local timer)

## Quick start

Pick **one** setup path for Postgres/Redis. API, client, and admin always run on your machine (not in Docker).

### Docker (Postgres + Redis in containers)

```bash
pnpm install
pnpm serve:docker     # first time — Docker up, env, migrate, seed
pnpm local:docker     # daily prep (optional; dev:all runs bootstrap automatically)
```

### Native (local Postgres)

```bash
pnpm install
pnpm serve:native     # first time — createdb kloqra, env, migrate, seed
pnpm local:native     # daily prep (optional; dev:all runs bootstrap automatically)
```

`pnpm serve` and `pnpm local` use whichever mode you last ran (stored in `.kloqra-deps-mode`).

### Daily dev — pick one workflow

**Option 1 — all apps in one terminal:**

```bash
pnpm dev:all          # same as pnpm dev
```

**Option 2 — one app per terminal** (run `dev:split` or `local` once, then open four terminals):

```bash
pnpm dev:split        # daily prep (same as pnpm local)
pnpm dev:shared       # terminal 1 — contracts + ui watch (start first)
pnpm dev:api          # terminal 2 — :3001
pnpm dev:client       # terminal 3 — :3000
pnpm dev:admin        # terminal 4 — :3002
pnpm dev:platform     # terminal 5 — :3003 (internal platform admin)
```

Demo logins after seed: `admin@kloqra.dev` / `member@kloqra.dev` (password `password123`). Platform: `platform@kloqra.dev` / `password123`. Local database name: **`kloqra`** (CI uses `kloqra_test`).

See [ENVIRONMENT.md](ENVIRONMENT.md) for variable details.

## Monorepo layout

| Path                  | Purpose                                         |
| --------------------- | ----------------------------------------------- |
| `apps/api`            | NestJS API — sole write path to PostgreSQL      |
| `apps/client`         | Next.js member app (timer, timesheet)           |
| `apps/admin`          | Next.js admin app (dashboard, billing, exports) |
| `apps/platform-admin` | Next.js internal platform console (SaaS-F14)    |
| `packages/contracts`  | Zod DTOs and route constants (SSOT)             |
| `packages/ui`         | Shared UI primitives, tables, modals, charts    |
| `packages/web-shared` | API client, profile/settings, list hooks        |
| `docs/`               | Documentation hub                               |

## Contract-first workflow

1. Add or change Zod schemas in `packages/contracts/src/dto/`.
2. Export types and `ROUTES` from `packages/contracts`.
3. Implement API in `apps/api/src/modules/<feature>/`.
4. Implement UI in `apps/client` or `apps/admin` (use `@kloqra/ui` + `@kloqra/web-shared`).
5. Add or update `docs/specs/<feature>.md`.
6. Add a line to [docs/README.md](../README.md) if the feature is new.

UI conventions: [FRONTEND-UI.md](./FRONTEND-UI.md).

Do not duplicate DTO shapes in the API or frontends.

## API module structure

Each feature lives under `apps/api/src/modules/<name>/`:

```
modules/<name>/
  domain/           # pure entities (optional)
  application/      # use cases / services
  infrastructure/   # Prisma, Redis adapters (optional)
  interface/http/   # controllers
  <name>.module.ts
```

**Rules:**

- No cross-imports between feature modules.
- Controllers use `ZodValidationPipe` with contract schemas.
- Workspace-scoped routes use `JwtAuthGuard` and `X-Workspace-Id` (see [AUTH.md](../architecture/AUTH.md)).

## Scripts (repository root)

| Command               | Description                              |
| --------------------- | ---------------------------------------- |
| `pnpm dev`            | Start API, client, and admin in parallel |
| `pnpm serve`          | Install, migrate, seed, then dev         |
| `pnpm build`          | Build all packages and apps              |
| `pnpm test`           | Unit tests in all packages               |
| `pnpm test:e2e`       | API health e2e + client Playwright smoke |
| `pnpm lint`           | Lint all packages                        |
| `pnpm prisma:migrate` | Apply migrations                         |
| `pnpm prisma:seed`    | Seed demo data                           |

## Pull request checklist

- [ ] Contracts updated if API shape changed
- [ ] `docs/specs/<feature>.md` updated for behavior changes
- [ ] `pnpm test` passes
- [ ] No secrets in committed files (`.env` stays local)
- [ ] If feature shipped: update [PRODUCT_ROADMAP.md](../architecture/PRODUCT_ROADMAP.md) **Shipped** section with spec link

## Documentation hygiene

- **`docs/specs/`** — canonical feature behavior (Given/When/Then or user stories + API).
- **`.cursor/plans/`** — design drafts only; promote to `docs/specs/` or `docs/architecture/` when the feature is done.
- **`docs/agent/ROC.md`** — log significant agent or human delivery milestones.
- **`CHANGELOG.md`** — user-visible changes per release (Keep a Changelog format).

## AI agent workflow

For agent-driven tasks, follow [agent/AGENTS.md](../agent/AGENTS.md): read the feature spec, update contracts, implement BE/FE, update ROC and TASK_BOARD.

## Getting help

- Architecture: [CONTEXT.md](../architecture/CONTEXT.md)
- API routes: [api/ROUTES.md](../api/ROUTES.md)
- Local issues: [runbooks/local-troubleshooting.md](../runbooks/local-troubleshooting.md)
