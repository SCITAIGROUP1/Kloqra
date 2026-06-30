# Contributing to Kloqra

## Prerequisites

- Node.js 20+
- pnpm 9.15 (`corepack enable` or `npx pnpm@9.15.0`)
- PostgreSQL (or Postgres.app) for local API

## Setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm prisma:migrate && pnpm prisma:seed
pnpm dev
```

## Commands

| Command                             | Purpose                 |
| ----------------------------------- | ----------------------- |
| `pnpm dev`                          | API + client + admin    |
| `pnpm lint`                         | ESLint (all workspaces) |
| `pnpm typecheck`                    | TypeScript `--noEmit`   |
| `pnpm format` / `pnpm format:check` | Prettier                |
| `pnpm test`                         | Unit tests              |
| `pnpm build`                        | Production build        |

## Git workflow

1. Create a feature branch from `main`
2. Pre-commit runs **lint-staged** (Prettier + ESLint on staged files)
3. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`)
4. Open a PR; CI runs format, lint, typecheck, test, build

## Contract-first

Shared API shapes and routes live in `packages/contracts`. See [docs/agent/AGENTS.md](docs/agent/AGENTS.md) for agent execution order and role boundaries.

Do not change contracts without LSA review (see `.cursor/rules/contracts-gate.mdc`).

## Architecture

- **API:** NestJS vertical slices under `apps/api/src/modules/`, shared kernel in `apps/api/src/common/`
- **Apps:** Next.js 15 App Router; shared FE code in `@kloqra/web-shared`
- **Shared UI:** `@kloqra/ui` — design system (tables, modals, loaders). `@kloqra/web-shared` — API client, profile/settings, hooks. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Cursor agents

- Rules: `.cursor/rules/*.mdc`
- Skills: `.cursor/skills/kloqra-*/SKILL.md`
