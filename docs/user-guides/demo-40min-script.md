# Kloqra — 40-minute technical demo script

Presenter guide for product + engineering audiences. Covers live product flows, architecture, engineering discipline, and **agentic-assisted development**.

**Duration:** 40 minutes (+ 5–10 min Q&A optional)  
**Format:** Two-browser live demo (member + admin) + IDE/repo walkthrough

---

## Quick reference

| Item                           | Value                                                            |
| ------------------------------ | ---------------------------------------------------------------- |
| Client                         | http://localhost:3000                                            |
| Admin                          | http://localhost:3002                                            |
| API                            | http://localhost:3001                                            |
| API docs (Swagger)             | http://localhost:3001/api/docs                                   |
| Test hub                       | `pnpm test:dashboard` → http://localhost:9321                    |
| Member login                   | `member@kloqra.dev` / `password123`                              |
| Admin login                    | `admin@kloqra.dev` / `password123`                               |
| Demo workspace                 | **Acme Corporation**                                             |
| Demo project (rich seed)       | **Client Portal Redesign** (Northwind Traders, ~82% budget burn) |
| Demo task (assigned to member) | **UX research**                                                  |
| Other seed users               | `alex@`, `jordan@`, `riley@` @ `kloqra.dev` (same password)      |

---

## Pre-demo checklist (15 min before)

### Environment

```bash
pnpm install
pnpm serve:docker    # or pnpm serve:native
pnpm dev:all         # API :3001, client :3000, admin :3002
```

- [ ] `GET http://localhost:3001/health` returns OK
- [ ] Redis running (or `REDIS_USE_MEMORY=true` — realtime works single-process only)
- [ ] Seed applied: projects visible in admin; member sees assigned tasks

### Browsers

- [ ] **Browser A:** member session on client
- [ ] **Browser B:** admin session on admin
- [ ] Member tab: DevTools → Network → filter **WS** → confirm `…/notifications` after login
- [ ] Bell icon shows connection indicator when socket live

### IDE / repo (optional second screen)

- [ ] `packages/contracts/src/routes.ts` open
- [ ] `.cursor/rules/master-orchestrator.mdc` open
- [ ] `docs/api/ROUTES.md` open
- [ ] Screenshot or tab: GitHub Actions CI green on `main` / `dev`

### Fallback assets if live demo fails

- [ ] `apps/client/e2e/submissions.spec.ts` recording or Playwright report
- [ ] `.cursor/plans/websocket_notifications_guide.plan.md` (realtime diagram)
- [ ] `docs/architecture/CONTEXT.md` mermaid diagram

---

## Minute map

| Time  | Section                     | Mode          |
| ----- | --------------------------- | ------------- |
| 0–3   | Hook & positioning          | Talk          |
| 3–8   | Architecture & completeness | Talk + IDE    |
| 8–16  | Member app (client)         | Live          |
| 16–24 | Admin app                   | Live          |
| 24–30 | Technical deep dive         | IDE + diagram |
| 30–35 | Engineering discipline      | Talk + CI     |
| 35–40 | Agentic development         | IDE + story   |
| 40+   | Q&A                         | —             |

---

## 0–3 min — Hook

### Opening line

> **Kloqra is a time analytics engine for agencies and product teams** — not a standalone timer. Members capture time with low friction; admins enforce accountability through approvals and turn hours into billing-ready exports. One API, two role-specific apps, built as a contract-first monorepo with production CI and agent-assisted delivery.

### Problem → solution (30 sec)

| Pain                     | Kloqra answer                                     |
| ------------------------ | ------------------------------------------------- |
| Time in spreadsheets     | Timer + timesheet + time tracker, one ledger      |
| “Did they submit?”       | Per-project approval workflow + notifications     |
| Payroll / client reports | Export wizard, schedules, invoice PDF, public API |
| Admin blind spots        | Dashboard, utilization, team live presence        |

### Who it’s for

- Digital agencies (multi-project, multi-client)
- Product/engineering teams with billable + internal work
- Ops leads who need **approve → bill → export** without replacing QuickBooks

### Positioning (honest)

> Pilot-ready B2B SaaS (~7.5/10 production maturity). Strong on architecture and workflow depth; H0 roadmap covers rate-limit verification and prod WebSocket runbooks before broad public launch.

---

## 3–8 min — Architecture & completeness

### Stack slide / talk track

| Layer          | Technology                                  | Why                                                         |
| -------------- | ------------------------------------------- | ----------------------------------------------------------- |
| API            | NestJS 10, Prisma, PostgreSQL 16            | Vertical slices, typed ORM, migrations                      |
| Cache / queues | Redis, BullMQ                               | Timer state, export jobs, notification pub/sub, rate limits |
| Client         | Next.js 15 App Router, Zustand, Tailwind v4 | Member UX                                                   |
| Admin          | Next.js 15 App Router                       | Operator UX — separate deploy                               |
| Contracts      | Zod in `@kloqra/contracts`                  | Single source of truth for routes + DTOs                    |
| UI             | `@kloqra/ui`                                | Shared tables, modals, design system                        |
| Shared logic   | `@kloqra/web-shared`                        | Auth, API client, realtime, hooks                           |

### Monorepo map (show tree)

```
ChronoMint/
├── apps/
│   ├── api/           # NestJS — sole write path to PostgreSQL
│   ├── client/        # MEMBER app (:3000)
│   ├── admin/         # ADMIN app (:3002)
│   └── assistant-api/ # FastAPI — internal LLM service (optional)
├── packages/
│   ├── contracts/     # routes.ts + dto/*.ts (Zod)
│   ├── ui/            # React components
│   └── web-shared/    # session, fetch, notifications socket, hooks
├── docs/
│   ├── specs/         # Feature SSOT (14 specs)
│   ├── api/ROUTES.md  # Human route catalog
│   └── architecture/  # CONTEXT, DATA_MODEL, KLOQRA_FUTURE_PLAN
└── .cursor/
    ├── rules/         # Agent role bounds
    ├── skills/        # Delivery playbooks
    └── plans/         # Feature + roadmap plans
```

### API modules shipped (name them — shows breadth)

`auth` · `workspace` · `users` · `projects` · `tasks` · `categories` · `timelogs` · `timer` · `timesheets` · `billing` · `reporting` · `presence` · `export` · `notifications` · `assistant` · `jira` · `health`

Each follows: `domain/` → `application/` → `infrastructure/` → `interface/http/` (no cross-module imports).

### Design principles (memorize three)

1. **Contract-first** — change `packages/contracts` before API or UI
2. **REST is truth, push is hint** — WebSocket sends invalidation scopes; pages REST-refetch
3. **Member privacy** — client never shows org revenue totals or peer rankings
4. **Manual ledger before automation** — time logs + approvals are authoritative; Jira/AI overlay

### Completeness statement

> Phases 1–2 complete on `TASK_BOARD.json`. Level-up sprints delivered: security hardening, workspace settings, submit/approve workflow, utilization, invoice export, Sentry, health checks, realtime notifications with task scope.

Point to **`docs/api/ROUTES.md`** — 200+ lines cataloging every route with controller links.

---

## 8–16 min — Member app (client)

**Login:** `member@kloqra.dev` → confirm workspace **Acme Corporation**

### 8–10 min — Timer (`/timer`)

**Click path:**

1. Select project **Client Portal Redesign**
2. Select task **UX research**
3. Click **Start**
4. Show elapsed counter ticking; optional **Pause** → **Resume**
5. **Stop** → creates time log

**Say:**

> Timer state lives server-side in Redis — refresh the page, timer persists. Multiple tabs reconcile via polling + push. Source is recorded as `timer` on the time log for audit.

**Technical callouts:**

- `POST /timer/start` · `/pause` · `/resume` · `/stop` · `/discard`
- `GET /timer/active`
- Auto-stop policy (stale timer dialog) — mention if visible in seed
- Optional: link Jira issue on entry (`GET /jira/my-issues`)

**Files:** `apps/client/src/features/timer/timer-page.tsx` · `apps/api/src/modules/timer/`

---

### 10–12 min — Timesheet (`/timesheet`)

**Click path:**

1. Week view — show entries on grid
2. Click a cell → add or edit manual entry (different from timer source)
3. Point out **locked** icon on approved-period entries (if seeded)
4. Toggle day/week view; show week boundaries respect timezone

**Say:**

> Timesheet is the editing surface; timer is the capture surface. Both write to the same `time_logs` table. Workspace settings (week start, timezone, rounding) flow through user profile effective preferences.

**Technical callouts:**

- `GET/POST/PATCH/DELETE /timelogs`
- `GET /timelogs/occupancy` — calendar heat
- `POST /timelogs/batch` — recurring entries
- Amendment flow when period already submitted

**Files:** `apps/client/src/features/timesheet/timesheet-page.tsx` · `docs/specs/timelogs.md`

---

### 12–14 min — Submissions (`/submissions`)

**Click path:**

1. Open **Submissions** — show week rows per assigned project
2. **Client Portal Redesign** should show approval-enabled status
3. If draft: click **Submit** for current week
4. Show status: draft → submitted (waiting admin)

**Say:**

> Approval is **per project** — not global. Admin can enable/disable and set period (weekly). Member sees only their assigned projects.

**Technical callouts:**

- `GET /timesheets/submissions` · `POST /timesheets/submit`
- `GET /timesheets/submit-preview`
- `POST /timesheets/:periodId/amendments` — edit after submit

**Spec:** `docs/specs/submissions.md`

---

### 14–16 min — Realtime hero moment ⭐

**Setup:** Member stays on **Submissions** or **Timer** (task picker visible)

**Admin browser (parallel):**

1. `/approvals` → find member’s pending submission → **Approve**  
   **OR**
2. `/projects` → **Client Portal Redesign** → assign member to a new task

**Member browser (no refresh):**

1. Bell badge increments
2. Open notifications dropdown — new item with deep link
3. Submissions table / task picker updates automatically

**DevTools (10 sec):**

- Network → WS → `notification.created` event payload
- Optional: show scopes in invalidation (`submissions`, `tasks`, etc.)

**Say (script):**

> We don’t push full timesheet JSON over the socket — that would duplicate REST and go stale. We push a **small notification** plus **which caches to invalidate**. The client refetches via HTTP. PostgreSQL remains source of truth. If the socket drops, a 60-second poll keeps the bell roughly correct; reconnect triggers a broad catch-up refetch.

**Architecture (verbal):**

```
createInApp → Redis PUBLISH notifications:user:{userId}
           → NotificationsGateway (Socket.IO /notifications)
           → notification-socket-manager (browser)
           → bell store + invalidateWorkspaceData(scopes)
           → WORKSPACE_DATA_STALE_EVENT → page stores refetch
```

**Scopes today:** `submissions` · `timesheet` · `projects` · `tasks` · `pending_approvals`

**Docs:** `docs/specs/notifications-realtime.md` · `.cursor/plans/websocket_notifications_guide.plan.md`

---

### Member extras (if time remains in block)

Pick **one** — don’t rush all:

| Feature             | Path             | Talking point                                  |
| ------------------- | ---------------- | ---------------------------------------------- |
| Time tracker        | `/time-tracker`  | Filterable log history, week grouping          |
| Dashboard           | `/dashboard`     | Draggable widgets, personal stats              |
| Export my data      | Profile → export | `POST /export/me` — member-scoped              |
| Assistant           | Floating widget  | Product help + deep links; no writes to ledger |
| My projects         | `/projects`      | Assigned projects + tasks tab                  |
| Notifications inbox | `/notifications` | Full history, mark read                        |

**Assistant detail (if shown):**

- `POST /assistant/chat` → NestJS proxy → FastAPI `assistant-api` → OpenAI
- Rate limited; circuit breaker; knowledge from `apps/assistant-api/src/knowledge.py`
- **No time data sent to model** in v1 — help only

---

## 16–24 min — Admin app

**Login:** `admin@kloqra.dev`

### 16–18 min — Projects & team (`/projects`)

**Click path:**

1. Open **Client Portal Redesign**
2. Show: color, client name (Northwind Traders), budget hours, **~82% burn** (seed)
3. **Timesheet approval** enabled — tie back to member submissions
4. **Team tab** — member assigned; add/remove or assign task
5. **Categories** — UI/UX Design, Software Development, etc.
6. Optional: **bulk category import** — template download, Excel upload, async job

**Say:**

> Project team ≠ workspace membership. A member only logs time on projects they’re assigned to. Budget burn feeds reporting and `budget.near` / `budget.over` notifications.

**Technical:** `PATCH /projects/:id` · team invites `POST /projects/:id/team/invites` · `docs/specs/projects.md` · `docs/specs/categories.md`

---

### 18–20 min — Approvals (`/approvals`)

**Click path:**

1. **Pending** tab — member submissions (from earlier demo or seed)
2. **Approve** with optional note — member realtime updates
3. **Rejected** / **Approved** history tabs
4. **Amendments** — member requested edit on locked period
5. **Missing** submissions — who hasn’t submitted
6. **Send reminder** — `POST /timesheets/remind`

**Say:**

> This is the accountability loop agencies pay for. Audit events on time logs complement approval state.

**Technical:** `PATCH /timesheets/:id/approve|reject` · `GET /timelogs/audit` (admin)

---

### 20–22 min — Dashboard & team live

**Dashboard (`/dashboard`):**

1. Period filter — week / month
2. Widgets: utilization, project split, category heatmap
3. **Arrange mode** — drag/resize (responsive grid layouts)
4. Optional: **widget share** — public token URL for read-only embed

**Team live (`/team`):**

1. Who’s online, active timer indicators
2. **SSE stream** — `GET /presence/stream` (contrast with Socket.IO notifications)

**Say:**

> Two realtime transports by design: Socket.IO for user notifications; SSE for admin presence fan-out. Both use Redis for multi-replica API on Railway.

**Specs:** `docs/specs/reporting.md` · `docs/specs/presence.md`

---

### 22–24 min — Billing & exports

**Billing (`/billing`):**

- Member/project rates · summary aggregates
- `GET /billing/rates` · `GET /billing/summary`

**Exports (`/exports`):**

1. **New export** — pick report type (timesheet detail, budget vs actual, utilization…)
2. **Preview** — `POST /export/preview`
3. **Run** — small = immediate download; large = **job queue**
4. **Jobs** — `GET /export/jobs/:id` → poll → download
5. Mention: **presets**, **schedules**, **invoice PDF** (`POST /export/invoice`), **share links**

**Say:**

> Exports are a first-class product — not CSV bolt-on. Async jobs via BullMQ protect API from 100k-row reports.

**Member contrast:** members use simplified `POST /export/me` — no admin wizard.

**Spec:** `docs/specs/export.md` (largest spec — worth mentioning)

---

### Admin power features (pick 1 if ahead of schedule)

| Feature              | How to show                                   | Technical                                   |
| -------------------- | --------------------------------------------- | ------------------------------------------- |
| Global search        | `Cmd+K` / palette                             | `docs/specs/global-search.md`               |
| Impersonation        | Admin → view as member (read-only client)     | `apps/client/e2e/impersonation.spec.ts`     |
| Jira                 | Workspace settings → credentials              | `apps/api/src/modules/jira/`                |
| Public reporting API | Settings → API keys                           | `docs/api/public-reporting-client-guide.md` |
| Workspace settings   | `/workspace` — timezone, week start, rounding | `Workspace.settings` JSON                   |

---

## 24–30 min — Technical deep dive (IDE)

### 24–25 min — Contracts SSOT

**Open:** `packages/contracts/src/routes.ts`

**Show:**

- Nested `ROUTES.TIMESHEETS.SUBMIT` etc. — same strings API + clients use
- Open `packages/contracts/src/dto/timesheet.dto.ts` — Zod schemas infer TypeScript types
- Open `packages/contracts/src/notification-realtime.ts` — socket event + invalidate scopes

**Say:**

> Add a route here first. API controller and both Next apps import from `@kloqra/contracts`. Turbo builds packages before apps. Breaking changes fail typecheck across the monorepo.

---

### 25–26 min — API vertical slice example

**Open:** `apps/api/src/modules/timelogs/`

```
timelogs/
├── application/timesheets.service.ts    # submit, approve, amend
├── application/timelogs.service.ts      # CRUD
├── interface/http/timesheets.controller.ts
└── interface/http/timelogs.controller.ts
```

**Say:**

> No module imports another module’s internals — only shared `common/` and contracts. New features = new folder, new spec, new tests.

---

### 26–27 min — Auth & multi-tenancy

**Talking points:**

- `POST /auth/login` → access JWT + httpOnly refresh cookie
- Refresh rotation with grace window (`REFRESH_ROTATION_GRACE_MS`)
- Every workspace route: `JwtAuthGuard` + `X-Workspace-Id`
- Roles: `ADMIN` vs `MEMBER` — admin controllers gated
- 2FA: `POST /users/me/2fa/enable`
- Production: `AUTH_COOKIE_SAME_SITE=none` for Vercel + Railway cross-site
- Throttler on auth endpoints (`apps/api/src/main.ts`)

**Doc:** `docs/development/SECURITY.md` · `docs/architecture/AUTH.md`

---

### 27–28 min — Data platform & scale

**Partitioning (differentiator):**

- `time_logs` — monthly partitions on `start_time`
- `time_log_audit_events` — yearly partitions on `created_at`
- Compound PKs `(id, start_time)` for PostgreSQL partition rules
- Cursor pagination: `id:startTime` — no extra lookup

**Doc:** `docs/architecture/DATABASE_PARTITIONING.md`

**Say:**

> We planned for agency-scale log volume before it hurt query performance — not a typical MVP shortcut.

**Also mention:**

- Prisma migrations + `pnpm prisma:seed` (rich Acme dataset)
- BullMQ workers: exports, bulk category import

---

### 28–30 min — Realtime & dual transport

**Draw or show plan diagram:**

| Use case              | Transport     | Path                    |
| --------------------- | ------------- | ----------------------- |
| User notifications    | Socket.IO     | `/notifications`        |
| Admin presence        | SSE           | `/presence/stream`      |
| Cross-replica fan-out | Redis pub/sub | API replicas on Railway |

**Key files:**

- `apps/api/src/modules/notifications/interface/ws/notifications.gateway.ts`
- `apps/api/src/modules/notifications/application/notifications-realtime.service.ts`
- `packages/web-shared/src/realtime/notification-socket-manager.ts`
- `apps/client/src/lib/workspace-data-sync.ts`

**Intentional limits (shows maturity):**

> We do **not** live-sync every admin settings change — only workflow events. Documented in websocket plan “Coverage — addressed vs not”.

---

## 30–35 min — Engineering discipline

### Feature delivery order (say it — it’s the culture)

```
1. docs/specs/<feature>.md
2. packages/contracts (+ failing spec)
3. Failing tests (QA / TDD)
4. apps/api module
5. apps/client or apps/admin
6. TASK_BOARD.json + docs/agent/ROC.md
7. pnpm format:check && lint && typecheck && test && build
```

### CI pipeline (show `.github/workflows/ci.yml` or diagram in `docs/architecture/ci-cd-pipeline.md`)

| Job             | What it proves                                                  |
| --------------- | --------------------------------------------------------------- |
| **quality**     | Prettier, ESLint, TypeScript, Turbo build, client bundle budget |
| **unit**        | Vitest + coverage artifacts (api, contracts, ui, web-shared)    |
| **integration** | Postgres 16 + Redis 7, migrate, seed, Supertest e2e             |
| **e2e**         | Playwright Chrome — admin + client against live API             |

**Deploy** (`.github/workflows/deploy.yml`): CI green on `main` → migrate → Railway API → health wait → Vercel client + admin → smoke checks.

### Test inventory (breadth = confidence)

**Client e2e:** smoke · timesheet · submissions · time-tracker · dashboard · onboarding · profile · settings · assistant · impersonation

**Admin e2e:** smoke · approvals · projects · billing · exports-quick · categories · global-search · team-management

**Pre-commit:** Husky + lint-staged + `scripts/check-staged-has-tests.mjs` — code without tests blocked.

### Documentation culture

| Area               | Location                                               |
| ------------------ | ------------------------------------------------------ |
| Feature specs (14) | `docs/specs/*.md`                                      |
| API catalog        | `docs/api/ROUTES.md`                                   |
| User guides        | `docs/user-guides/member/` · `admin/` · `qa/`          |
| Runbooks           | `docs/runbooks/deploy.md` · `railway.md` · `vercel.md` |
| Future plan        | `docs/architecture/KLOQRA_FUTURE_PLAN.md`              |

### Swagger

> `http://localhost:3001/api/docs` — OpenAPI generated; demo if time.

---

## 35–40 min — Agentic-assisted development ⭐

### Framing (30 sec)

> Kloqra was built and extended using **Cursor agents under explicit rules** — not ad-hoc chat coding. Humans orchestrate; agents implement inside directory bounds; CI is the final judge. This is how we shipped realtime notifications, bulk categories, and the future roadmap doc in days, not weeks.

### Show: orchestration layer

| File                                    | What to say                                                            |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `.cursor/rules/master-orchestrator.mdc` | Lead architect policy: contract-first, test-with-feature, MIP handoffs |
| `.cursor/rules/role-be.mdc`             | BE agent may only touch `apps/api/src/`                                |
| `.cursor/rules/role-fe.mdc`             | FE agent: `apps/client`, `apps/admin`, `packages/ui`                   |
| `.cursor/rules/role-qa.mdc`             | QA agent: `*.spec.ts`, `e2e/` only                                     |
| `.cursor/rules/contracts-gate.mdc`      | LSA owns `packages/contracts`                                          |
| `.cursor/rules/testing-tdd.mdc`         | Tests required per layer                                               |

### Show: skills (repeatable playbooks)

| Skill                                                 | Purpose                                   |
| ----------------------------------------------------- | ----------------------------------------- |
| `.cursor/skills/chronomint-feature-delivery/SKILL.md` | Order: spec → contracts → tests → BE → FE |
| `.cursor/skills/chronomint-test-delivery/SKILL.md`    | Required test file per layer              |
| `.cursor/skills/chronomint-api-slice/SKILL.md`        | NestJS vertical slice template            |
| `.cursor/skills/chronomint-fe-feature/SKILL.md`       | Next.js feature folder conventions        |

### Show: sprint state

- `TASK_BOARD.json` — P1/P2 tasks all `done`
- `docs/agent/AGENTS.md` — agent playbook
- `docs/agent/ROC.md` — record of changes per task

### MIP handoff protocol

Agents return structured completion blocks:

```markdown
<SYNC_BLOCK status="DONE" task_id="P3-02">

- Modified: packages/contracts/..., apps/api/...
- Tests: pnpm test — 142 passed
  </SYNC_BLOCK>
```

Parallel agents don’t conflict because **directory bounds** are enforced in rules.

### Case study: WebSocket live sync (3 min story)

| Step          | What agents did                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------- |
| **Problem**   | Admin approves timesheet; member UI stale up to 60s                                            |
| **Spec**      | `docs/specs/notifications-realtime.md`                                                         |
| **Contracts** | `notification-realtime.ts`, scopes enum, `project.approvalSettingsChanged` template            |
| **API**       | `notifications.gateway.ts`, Redis publisher, hook in `createInApp`                             |
| **Shared**    | `notification-socket-manager.ts`, `workspace-data-sync.ts`, `use-notification-socket.ts`       |
| **Client**    | `workspace-shell.tsx`, `workspace-data-sync.ts`, page stale listeners                          |
| **Tests**     | gateway spec, workspace-data-sync specs (client + web-shared), contracts spec                  |
| **Plan**      | `.cursor/plans/websocket_notifications_guide.plan.md` — before/after, env vars, coverage table |
| **Follow-up** | `tasks` scope for assign/unassign — same pattern, one PR                                       |

**Lesson for audience:**

> Agents didn’t skip tests or docs. They followed the same gates a human team would — faster execution, same quality bar.

### Case study: Future roadmap (30 sec)

> `docs/architecture/KLOQRA_FUTURE_PLAN.md` + `.cursor/plans/kloqra_future_roadmap.plan.md` — agent-drafted horizons H0–H4 with explicit “won’t build” list. Product maturity includes knowing what to defer.

### What agentic coding is NOT here

- Not unreviewed merges — human reviews PRs
- Not “no specs” — `docs/specs/` required
- Not cross-cutting chaos — role bounds + contracts gate
- Not replacing CI — turbo test pipeline is authoritative

### Close (30 sec)

> Kloqra demonstrates that a **small team + agent factory** can deliver production-grade B2B SaaS: dual apps, approval workflows, exports, realtime, partitioning, full CI — with documented scope and honest roadmap. Next step: H0 pilot customers on production.

---

## Q&A cheat sheet

| Question                           | Answer                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **vs Harvest / Toggl / Clockify?** | Deeper **approval workflow**, **agency admin split**, **export/invoice** focus, **public API**; less marketplace/integrations breadth today |
| **Mobile?**                        | Responsive web today; PWA + offline queue on H3 roadmap                                                                                     |
| **Multi-tenant?**                  | Workspace-scoped; all queries join through project/workspace                                                                                |
| **Accounting integration?**        | Export-first (CSV/Excel/PDF); no QuickBooks sync in scope                                                                                   |
| **AI replacing timesheet?**        | Assistant is help-only v1; smart categorization H4                                                                                          |
| **How much is AI-generated?**      | Features implemented by agents **under rules**; human orchestrates; tests + CI validate                                                     |
| **Open source?**                   | Private repo (adjust if public)                                                                                                             |
| **Pricing / SaaS model?**          | (Your business answer)                                                                                                                      |
| **Security certifications?**       | Security doc + throttling; SOC2 not claimed — H2+ if enterprise                                                                             |
| **Uptime / SLA?**                  | Railway + Vercel; health check + Sentry; formal SLA = ops maturity item                                                                     |

---

## Shorten / lengthen guide

### If you only have 25 min

| Cut                          | Keep                                  |
| ---------------------------- | ------------------------------------- |
| Assistant, Jira, bulk import | Timer + submissions + realtime moment |
| Partitioning deep dive       | Architecture 3 min version            |
| Full export wizard           | Mention async jobs only               |
| Agentic section              | 2 min case study only                 |

### If you have 50 min

| Add                             | Time    |
| ------------------------------- | ------- |
| Live `pnpm test:dashboard` tour | +5 min  |
| Swagger walkthrough             | +3 min  |
| Show one Playwright e2e running | +5 min  |
| Impersonation flow live         | +3 min  |
| Q&A                             | +10 min |

---

## Demo data reference (seed)

**Workspace:** Acme Corporation (`slug: acme`)  
**Settings:** Monday week start, America/New_York, 40h weekly / 8h daily targets

**Notable projects:**

| Project                | Client            | Notes                                               |
| ---------------------- | ----------------- | --------------------------------------------------- |
| Client Portal Redesign | Northwind Traders | Approval on, 82% budget burn, member on UX research |
| Brand Campaign Q2      | Fabrikam Media    | (second project — use for filters)                  |

**If submissions empty:** member submits week live, or re-seed: `pnpm prisma:seed`

---

## Related docs

- [User guides hub](./README.md)
- [Member getting started](./member/getting-started.md)
- [Admin getting started](./admin/getting-started.md)
- [Timesheet submissions and approval](./timesheet-submissions-and-approval.md)
- [QA testing guide](./qa/testing-guide.md)
- [Architecture context](../architecture/CONTEXT.md)
- [KLOQRA future plan](../architecture/KLOQRA_FUTURE_PLAN.md)
- [CI/CD pipeline](../architecture/ci-cd-pipeline.md)

---

_Last updated: June 2026 — revise after major releases or seed changes._

**Slide deck:** [presentations/kloqra-demo-and-roadmap.pdf](../presentations/kloqra-demo-and-roadmap.pdf)
