# Kloqra

Next-gen time analytics engine — contract-first monorepo with NestJS API, Next.js client & admin apps.

## Stack

- **API:** NestJS, Prisma, PostgreSQL, Redis
- **Client / Admin:** Next.js 15 (App Router), Zustand, Tailwind v4
- **Shared:** `@kloqra/contracts` (Zod), `@kloqra/ui`, `@kloqra/web-shared`

## Quick start

Pick **one** setup path. Both scripts create env files, migrate, and seed when the database is empty. API, client, and admin always run locally.

### Docker (Postgres + Redis in containers)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
pnpm install
pnpm serve:docker   # first time: Docker up, env, migrate, seed
```

### Native (local Postgres + Redis)

Requires PostgreSQL on port 5432 ([Postgres.app](https://postgresapp.com/) on Mac) and optionally Redis on 6379.

```bash
pnpm install
pnpm serve:native   # first time: createdb kloqra, env, migrate, seed
```

Without Redis, bootstrap sets `REDIS_USE_MEMORY=true` automatically.

Deps mode (Docker vs native) is stored in `.kloqra-deps-mode`. Set it once with `pnpm local:docker` or `pnpm local:native`.

### Daily dev — pick one workflow

**Option 1 — all apps in one terminal** (bootstrap + build shared packages, then API, client, admin):

```bash
pnpm dev:all
```

**Option 2 — one app per terminal** (prep once, then open four terminals):

```bash
pnpm dev:split      # daily prep — Postgres, env, migrate (same as pnpm local)
pnpm dev:shared     # terminal 1 — contracts + ui watch (start first)
pnpm dev:api        # terminal 2 → :3001
pnpm dev:client     # terminal 3 → :3000
pnpm dev:admin      # terminal 4 → :3002
```

`pnpm dev` is an alias for `pnpm dev:all`. Split mode does not start apps — run the four `dev:*` commands above after `pnpm dev:split`.

**Upgrading from ChronoMint:** Docker path auto-resets stale volumes. Native path rewrites `chronomint` → `kloqra` in `.env`. Wipe Docker data manually: `pnpm docker:reset`.

| App    | URL                   |
| ------ | --------------------- |
| Client | http://localhost:3000 |
| Admin  | http://localhost:3002 |
| API    | http://localhost:3001 |

**Seed accounts:** `admin@kloqra.dev` / `member@kloqra.dev` — password `password123` (primary workspace: **Acme Corporation**)

### Client vs admin

| Feature                                   | Client (`:3000`)     | Admin (`:3002`) |
| ----------------------------------------- | -------------------- | --------------- |
| Timer, timesheet, time tracker            | Yes                  | No              |
| Member dashboard widgets                  | Yes (`/dashboard`)   | No              |
| Submit timesheets for approval            | Yes (`/submissions`) | No              |
| Notifications inbox (bell)                | Yes                  | Yes             |
| View assigned projects & tasks            | Yes                  | No              |
| Profile & account settings                | Yes                  | Yes             |
| Create projects, categories, team invites | No                   | Yes             |
| Team management & timesheet approvals     | No                   | Yes             |
| Dashboard analytics widgets               | No                   | `/dashboard`    |
| Team live presence                        | No                   | `/team`         |
| Billing rates                             | No                   | `/billing`      |
| Export my timesheet (CSV/Excel/PDF)       | Yes (timesheet page) | No              |
| Multi-report export & invoice wizard      | No                   | `/exports`      |

Sign in to admin with **`admin@kloqra.dev`** (member accounts are redirected).

## Docs

**[Documentation hub](docs/README.md)** — start here for full index.

- [Contributing](CONTRIBUTING.md) · [Environment](docs/development/ENVIRONMENT.md) · [Testing](docs/development/TESTING.md) · [Frontend UI](docs/development/FRONTEND-UI.md)
- [Architecture](docs/architecture/CONTEXT.md) · [API routes](docs/api/ROUTES.md) · [Product roadmap](docs/architecture/PRODUCT_ROADMAP.md)
- [User guides](docs/user-guides/README.md) · [Deploy runbook](docs/runbooks/deploy.md) · [Agent playbook](docs/agent/AGENTS.md)
