---
name: Project Hardening Plan
overview: Establish ESLint + Prettier + pre-commit/CI gates, expand Cursor rules/skills, and execute a phased structural refactor to fix the biggest consistency, DRY, and separation-of-concerns gaps across API modules and both Next.js apps.
todos:
  - id: eslint-prettier
    content: Implement packages/config-eslint + Prettier, wire lint/typecheck/format scripts in all workspaces
    status: completed
  - id: precommit-ci
    content: Add husky + lint-staged + commitlint; extend .github/workflows/ci.yml with format:check and ESLint
    status: completed
  - id: cursor-governance
    content: Migrate .cursor/rules to .mdc with globs; add .cursor/skills (feature-delivery, api-slice, fe-feature); CONTRIBUTING.md
    status: completed
  - id: web-shared
    content: Create packages/web-shared (api, download, stores, providers, date utils, workspace-switcher); migrate client first
    status: completed
  - id: admin-features
    content: Refactor admin to server page.tsx + features/; move PageHeader primitives to @kloqra/ui
    status: completed
  - id: api-common-time
    content: Extract time aggregation/week/rounding to apps/api/src/common/time; fix billing DRY and Nest module exports
    status: completed
  - id: api-soc-routes
    content: Thin controllers (auth, team-invites, presence); ROUTES in contracts; DomainException in export; rename export-share consistently
    status: completed
isProject: false
---

# Kloqra Professionalization & Hardening Plan

## Current state (what is messy)

You already have **good intent** ([docs/agent/AGENTS.md](docs/agent/AGENTS.md), role rules in [.cursor/rules/](.cursor/rules/), contract-first playbook, CI on push/PR) but **weak enforcement** and **drift** in implementation.

```mermaid
flowchart TB
  subgraph today [Today]
    CI[CI: tsc + test + build]
    Rules[Cursor rules .md loose]
    Lint[lint = tsc only]
    FE1[admin: fat client pages]
    FE2[client: server page + features]
    API1[export imports reporting via relative path]
    API2[billing re-implements aggregation]
  end
  subgraph target [Target]
    PC[pre-commit: lint-staged]
    ESL[ESLint + Prettier + CI]
    Shared[@kloqra/web-shared]
    Core[api common: time + week + errors]
    Align[admin mirrors client architecture]
  end
  today --> target
```

| Area                  | Problem                                                                                                                                               | Examples                                                                                                                                                                                                                                                                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Tooling**           | No pre-commit; `lint` is only `tsc --noEmit`; [@kloqra/config-eslint](packages/config-eslint/package.json) is an empty stub; no Prettier/EditorConfig | Easy to merge inconsistent formatting and ad-hoc patterns                                                                                                                                                                                                                                                                                              |
| **Cursor governance** | Rules are `.md` without `globs`/`alwaysApply`; no project **skills** under `.cursor/skills/`                                                          | Agents follow playbook inconsistently                                                                                                                                                                                                                                                                                                                  |
| **FE duplication**    | Near-identical copies across apps                                                                                                                     | [apps/admin/src/lib/api.ts](apps/admin/src/lib/api.ts) vs [apps/client/src/lib/api.ts](apps/client/src/lib/api.ts); `providers.tsx`, `workspaces.store.ts`, `session.store.ts`, `workspace-switcher.tsx`, `download.ts`                                                                                                                                |
| **FE architecture**   | Admin is all `"use client"` route files; client uses thin server `page.tsx` + `features/`                                                             | [apps/admin/src/app/(admin)/dashboard/page.tsx](<apps/admin/src/app/(admin)/dashboard/page.tsx>) vs [apps/client/src/app/(workspace)/timesheet/page.tsx](<apps/client/src/app/(workspace)/timesheet/page.tsx>)                                                                                                                                         |
| **FE API usage**      | Public pages bypass shared client                                                                                                                     | [apps/admin/src/app/share/[token]/page.tsx](apps/admin/src/app/share/[token]/page.tsx), [apps/client/src/app/invite/[token]/page.tsx](apps/client/src/app/invite/[token]/page.tsx)                                                                                                                                                                     |
| **BE cross-module**   | Relative imports across slices instead of module exports                                                                                              | `export` → `../../reporting/application/time-aggregation.service`                                                                                                                                                                                                                                                                                      |
| **BE DRY**            | Parallel time math                                                                                                                                    | [billing.service.ts](apps/api/src/modules/billing/application/billing.service.ts) vs [time-aggregation.service.ts](apps/api/src/modules/reporting/application/time-aggregation.service.ts); duplicate `round()` in reporting; [export-week.util.ts](apps/api/src/modules/export/application/export-week.util.ts) vs private `weekStart()` in reporting |
| **BE SoC**            | Controllers talk to Prisma                                                                                                                            | [auth.controller.ts](apps/api/src/modules/auth/interface/http/auth.controller.ts), [team-invites.controller.ts](apps/api/src/modules/projects/interface/http/team-invites.controller.ts)                                                                                                                                                               |
| **BE consistency**    | Mixed error types; mixed route definitions                                                                                                            | Export presets use Nest `NotFoundException`; projects/timelogs use `DomainException`; hardcoded paths in projects/workspace controllers while others use `ROUTES` from contracts                                                                                                                                                                       |
| **Naming**            | Same feature, different prefixes                                                                                                                      | `report-share.service.ts` vs `export-share.controller.ts` under `export/`                                                                                                                                                                                                                                                                              |

**Intentionally not pushing full DDD** (`domain/` / `infrastructure/` per module): the repo’s established slice is `application/` + `interface/http/` + `apps/api/src/common/`. The plan **strengthens** that model rather than introducing a second architecture.

---

## Phase 1 — Tooling foundation (do first; unblocks everything)

### 1.1 ESLint + Prettier monorepo config

Implement shared packages (populate the stub):

- **[packages/config-eslint/](packages/config-eslint/)** — flat ESLint config exporting:
  - TypeScript (`typescript-eslint`)
  - Import order + `no-duplicates`
  - React/Next rules for `apps/admin`, `apps/client`
  - Nest-friendly rules for `apps/api`
  - **Boundary rule**: ban `../../<other-module>/` imports from `apps/api/src/modules/*` (force Nest `exports` / `common/`)
- **New `packages/config-prettier/`** (or `prettier.config.js` at root) — single Prettier config + `.prettierignore`
- Wire each workspace `package.json` `lint` to `eslint .` (keep `tsc --noEmit` as `typecheck` script or run both in CI)

Root scripts in [package.json](package.json):

```json
"typecheck": "pnpm -r exec tsc -p tsconfig.json --noEmit",
"lint": "pnpm -r lint",
"format": "prettier --write .",
"format:check": "prettier --check ."
```

### 1.2 Pre-commit + commit hygiene

- **husky** `prepare` script at repo root
- **lint-staged**: ESLint `--fix` + Prettier on staged `*.{ts,tsx,js,json,md}`
- Optional **@commitlint/cli** with conventional commits (`feat:`, `fix:`, `chore:`) — aligns with your existing commit style

### 1.3 CI alignment

Update [.github/workflows/ci.yml](.github/workflows/ci.yml) after local hooks work:

1. `pnpm format:check`
2. `pnpm lint` (ESLint)
3. `pnpm typecheck` (if split from lint)
4. existing `test` + `build`

### 1.4 Repo hygiene files

- `.editorconfig` (indent, charset, final newline)
- `CONTRIBUTING.md` — one page: branch flow, `pnpm` commands, contract gate, pre-commit expectations, link to AGENTS.md

---

## Phase 2 — Cursor rules & skills (agent consistency)

### 2.1 Migrate and expand rules (`.md` → `.mdc`)

Keep existing role boundaries; add **scoped** rules with frontmatter per [create-rule skill](file:///Users/chamal/.cursor/skills-cursor/create-rule/SKILL.md):

| Rule file                 | `globs`                      | Enforces                                                                                                                            |
| ------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `api-modules.mdc`         | `apps/api/src/modules/**`    | application/interface layout, no Prisma in controllers, `ROUTES` only, `DomainException`, module exports not relative cross-imports |
| `fe-app-router.mdc`       | `apps/{admin,client}/src/**` | server `page.tsx` + `features/<domain>/`, `"use client"` only where needed, use `@kloqra/web-shared`                                |
| `contracts-gate.mdc`      | `packages/contracts/**`      | extend [contract-lockdown-policy.md](.cursor/rules/contract-lockdown-policy.md)                                                     |
| `testing-tdd.mdc`         | `**/*.{spec,test}.ts`        | spec beside unit under test; contract tests in packages/contracts                                                                   |
| `master-orchestrator.mdc` | `alwaysApply: true`          | consolidate [master-orchestrator.md](.cursor/rules/master-orchestrator.md)                                                          |

Deprecate duplicate `.md` role files only after `.mdc` equivalents exist; link `AGENTS.md` from root [README.md](README.md).

### 2.2 Project skills (`.cursor/skills/`)

Add repo-local skills (not global Cursor skills):

- **`kloqra-feature-delivery`** — AGENTS execution order + MIP handoff template + required commands before PR
- **`kloqra-api-slice`** — how to add a module (folder layout, register in `app.module`, export services)
- **`kloqra-fe-feature`** — admin/client pattern: server page → feature component → stores → `api()`

### 2.3 Single source playbook

- Point root README “Contributing” → `CONTRIBUTING.md` → `docs/agent/AGENTS.md`
- Add **Architecture** section to [docs/README.md](docs/README.md): target diagrams for FE + API (short, links to this plan’s outcomes)

---

## Phase 3 — Shared frontend package (DRY + SoC)

### New package: `packages/web-shared`

Extract duplicated app code (client is the **reference** for SSR-safe patterns):

| Module                              | From                                                   | Notes                                                                          |
| ----------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `api/client.ts`                     | merged admin + client `api.ts`                         | Rich error parsing (admin version); `publicFetch()` for unauthenticated routes |
| `api/download.ts`                   | admin `apiDownloadPost` + client `download.ts`         | single `saveDownloadResponse`                                                  |
| `stores/session.ts`                 | client version with `window` guards                    | admin adopts guarded store                                                     |
| `stores/workspaces.ts`              | identical copies                                       | move as-is                                                                     |
| `components/providers.tsx`          | identical                                              | move as-is                                                                     |
| `utils/date-input.ts`               | `toDateInputValue` from admin `export-date-presets.ts` | remove inline copies in client timesheet                                       |
| `components/workspace-switcher.tsx` | parameterized                                          | props: `filterRole`, `defaultRedirect` (admin vs client behavior)              |

Both apps depend on `@kloqra/web-shared`; delete local duplicates; re-export thin wrappers only if app-specific.

### Admin structural alignment (mirror client)

Refactor admin routes to match client pattern:

```
apps/admin/src/
  app/(admin)/<route>/page.tsx     # server, default export, imports feature
  features/<domain>/<name>-page.tsx  # "use client"
  components/                        # shell-only: AdminShell, nav
```

Priority routes (largest files first): `dashboard`, `exports`, `projects`, `billing`, `workspace`, `team`.

Move [admin-page.tsx](apps/admin/src/components/admin-page.tsx) primitives (`PageHeader`, `StatCard`, `EmptyState`) into **`@kloqra/ui`** (or `web-shared/layout` if not design-system) so client stops hand-rolling `<h1>` headers.

### Public token pages

- `publicFetch(path)` in `web-shared` used by share + invite pages
- No inline `API_BASE` + raw `fetch` in route files

---

## Phase 4 — API consistency & DRY (separation of concerns)

### 4.1 Shared application kernel under `common/`

Create **`apps/api/src/common/time/`** (or `common/reporting/`):

- Move **`TimeAggregationService`**, rounding helpers, and week boundary utilities here (single implementation; delete duplicate `weekStart()` in reporting and inline rounding in billing/export legacy paths)
- **`BillingService.summary()`** delegates to shared aggregation — no parallel `timeLog.findMany` logic

### 4.2 Module boundaries (Nest, not relative paths)

- `ReportingModule` exports `TimeAggregationService` from `common/time` (or re-exports)
- `ExportModule` imports `ReportingModule` / `TimeModule` — remove `../../reporting/...` imports from [export.service.ts](apps/api/src/modules/export/application/export.service.ts) and [export-rows.builder.ts](apps/api/src/modules/export/application/export-rows.builder.ts)
- Relocate misplaced spec: `time-aggregation.export.spec.ts` → beside `time-aggregation.service` in common

### 4.3 Controller / service discipline

- **Auth** and **team-invites**: move Prisma calls into `AuthService` / `TeamInvitesService`; controllers only orchestrate DTO + guards
- **Presence**: inject `RedisService` in service layer, not [presence.controller.ts](apps/api/src/modules/presence/interface/http/presence.controller.ts)
- **Routes**: replace hardcoded strings in [projects.controller.ts](apps/api/src/modules/projects/interface/http/projects.controller.ts), [workspace.controller.ts](apps/api/src/modules/workspace/interface/http/workspace.controller.ts), [team-invites.controller.ts](apps/api/src/modules/projects/interface/http/team-invites.controller.ts) with `ROUTES` entries in [packages/contracts](packages/contracts/src/) (contract gate / LSA step)

### 4.4 Error and naming conventions

- Export subservices ([export-preset.service.ts](apps/api/src/modules/export/application/export-preset.service.ts), [export-schedule.service.ts](apps/api/src/modules/export/application/export-schedule.service.ts)): use **`DomainException`** + shared error codes like other modules
- Rename for consistency: pick **`export-share`** everywhere (`ReportShareService` → `ExportShareService` or keep service name but align file names) — one pass, update imports/tests

### 4.5 Export module decomposition (SoC without new layers)

Split god-module responsibilities (files already exist; clarify boundaries):

- **Render/export file generation** — `export-render.util`, `export-rows.builder`
- **Orchestration** — `export.service` coordinates only
- **Share links** — `export-share.controller` + share service
- Document in `apps/api/README.md` module map

---

## Phase 5 — Enforcement & cleanup

- Remove unused deps flagged in exploration (`react-hook-form`, unused `zod` in app `src` if still true after ESLint `no-unused-vars`)
- Add **`pnpm -r typecheck`** to CI; ensure `packages/web-shared` has lint/typecheck scripts
- ESLint `import/no-cycle` on `apps/api/src/modules`
- Optional: **dependency-cruiser** or `eslint-plugin-boundaries` for `web-shared` ← apps only (no reverse)

---

## Delivery strategy (PR-sized, aggressive but safe)

Work in **stacked PRs** to avoid a single unreviewable diff:

1. **PR1** — ESLint/Prettier packages + format entire repo once + husky/lint-staged + CI
2. **PR2** — Cursor `.mdc` rules + skills + CONTRIBUTING.md
3. **PR3** — `packages/web-shared` + client migration (reference impl)
4. **PR4** — admin `features/` refactor + ui layout primitives
5. **PR5** — API `common/time` + billing/reporting DRY + module export fixes
6. **PR6** — controller SoC + ROUTES contract additions + export naming/errors

Run after each PR: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

---

## Success criteria

- Every commit runs lint-staged; CI fails on format/lint/type errors
- Admin and client share one API client, stores, and date/download utilities
- Admin route files are thin server wrappers; domain UI lives under `features/`
- API modules do not relatively import sibling modules; time/week/round logic has one home
- Controllers do not use Prisma directly; export uses same error and route conventions as projects/timelogs
- Cursor agents have scoped `.mdc` rules + 3 project skills aligned with AGENTS.md
