---
marp: true
theme: default
paginate: true
header: "Kloqra"
footer: "Time analytics for agencies · June 2026"
style: |
  section {
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 28px;
  }
  section.lead {
    text-align: center;
    justify-content: center;
  }
  section.lead h1 {
    font-size: 2.4em;
    color: #236bfe;
  }
  h1 { color: #236bfe; font-size: 1.6em; }
  h2 { color: #1e3a5f; font-size: 1.2em; }
  table { font-size: 0.72em; width: 100%; }
  th { background: #236bfe; color: white; }
  tr:nth-child(even) { background: #f0f4ff; }
  code { background: #f0f4ff; color: #1e3a5f; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  blockquote { border-left: 4px solid #236bfe; padding-left: 1em; color: #444; font-size: 0.9em; }
---

<!-- _class: lead -->

# Kloqra

## Time analytics engine for agencies & product teams

**40-minute technical overview + 2026–2027 roadmap**

`member@kloqra.dev` · `admin@kloqra.dev` · `password123`

---

## The problem we solve

| Pain                         | Kloqra answer                                     |
| ---------------------------- | ------------------------------------------------- |
| Time trapped in spreadsheets | Timer + timesheet + time tracker — one ledger     |
| "Did they submit?"           | Per-project approval workflow + notifications     |
| Payroll / client reports     | Export wizard, schedules, invoice PDF, public API |
| Admin blind spots            | Dashboard, utilization, team live presence        |

> **Positioning:** Capture → approve → bill → export — without spreadsheet surgery.

---

## Vision & north-star outcomes

**Kloqra** — capture time with low friction, enforce accountability, turn hours into billing-ready insight.

| Stakeholder      | Success                                                              |
| ---------------- | -------------------------------------------------------------------- |
| **Member**       | Log time in <10s; know submission status; live UI on workflow events |
| **Admin**        | Burn, utilization, approvals in one place; export without Excel      |
| **Agency owner** | Multi-project profitability; client-ready reports                    |
| **Engineering**  | Contract-first; CI gates; observable production                      |

---

## Guiding principles

1. **Manual ledger before automation** — time logs + approvals are truth
2. **Contract-first** — `packages/contracts` before API or UI
3. **REST is truth, push is hint** — WebSocket invalidates; pages REST-refetch
4. **Member privacy** — no org revenue or peer rankings on client
5. **Small shippable epics** — one phase per PR

---

## Architecture

```
apps/client (:3000)  ─┐
apps/admin  (:3002)  ─┼─►  apps/api (:3001)  ──►  PostgreSQL
                      │         │
                      │         └──► Redis (timer, queues, pub/sub)
packages/contracts · ui · web-shared
```

| Layer     | Stack                                        |
| --------- | -------------------------------------------- |
| API       | NestJS, Prisma, PostgreSQL 16, Redis, BullMQ |
| Frontends | Next.js 15 App Router × 2                    |
| Shared    | Zod contracts, UI kit, auth + realtime hooks |

---

## API modules (breadth)

**17 feature modules** — each a vertical slice:

`auth` · `workspace` · `users` · `projects` · `tasks` · `categories` · `timelogs` · `timer` · `timesheets` · `billing` · `reporting` · `presence` · `export` · `notifications` · `assistant` · `jira` · `health`

`domain/` → `application/` → `infrastructure/` → `interface/http/`

**200+ routes** cataloged in `docs/api/ROUTES.md`

---

## Shipped today — production baseline

| Domain           | Highlights                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------- |
| **Core loop**    | Timer (pause/resume), timesheet, time tracker, tasks, projects, categories + bulk import |
| **Workflow**     | Per-project approval, submissions, amendments, locked entries                            |
| **Admin ops**    | Dashboard widgets, team live (SSE), billing, exports (async jobs, schedules, invoice)    |
| **Data**         | PostgreSQL range partitioning on `time_logs`                                             |
| **Integrations** | Jira Cloud, public reporting API, AI assistant                                           |
| **Realtime**     | Socket.IO notifications + scoped refetch (`tasks`, `submissions`, …)                     |
| **Quality**      | CI → unit → integration → e2e; Sentry; deploy runbooks                                   |

**Maturity: ~7.5/10** — pilot-ready; H0 hardening before broad launch

---

## Member app — capture time

**Demo path:** `/timer` → `/timesheet` → `/submissions`

| Step        | Show                                                  |
| ----------- | ----------------------------------------------------- |
| Timer       | Start on **Client Portal Redesign** / **UX research** |
| Timesheet   | Week grid; locked entries after approval              |
| Submissions | Submit week → status: draft → submitted               |

**Technical:** `POST /timer/*` · `POST /timelogs` · `POST /timesheets/submit`

Members see **assigned projects only** — project team ≠ workspace membership

---

## Admin app — operate the org

**Demo path:** `/projects` → `/approvals` → `/dashboard` → `/exports`

| Area      | Show                                                   |
| --------- | ------------------------------------------------------ |
| Projects  | Budget burn (~82% seed), approval toggle, team + tasks |
| Approvals | Pending → approve/reject; amendments; reminders        |
| Dashboard | Widgets, heatmaps, draggable layout                    |
| Team live | SSE presence — who's online, active timers             |
| Exports   | Preview, async jobs, presets, schedules, invoice PDF   |

**Technical:** `PATCH /timesheets/:id/approve` · `POST /export` · `GET /presence/stream`

---

## Hero moment — realtime live sync ⭐

**Two browsers:** member on Submissions · admin approves OR assigns task

**Member sees (no refresh):**

- Bell updates instantly
- Table / task picker refetches

```
createInApp → Redis PUBLISH → Socket.IO /notifications
           → invalidateWorkspaceData(scopes) → REST refetch
```

**Scopes:** `submissions` · `timesheet` · `projects` · `tasks` · `pending_approvals`

REST stays source of truth — socket sends hints only

---

## Dual realtime transports

| Use case           | Transport                      | Why                           |
| ------------------ | ------------------------------ | ----------------------------- |
| User notifications | **Socket.IO** `/notifications` | Bidirectional; per-user rooms |
| Admin presence     | **SSE** `/presence/stream`     | Server push; admin-only       |
| Multi-replica API  | **Redis pub/sub**              | Railway horizontal scale      |

**Deferred by design:** workspace timezone broadcast, cosmetic project rename — refresh on navigate is enough

---

## Scale — database partitioning

**Not a typical MVP shortcut**

- `time_logs` — monthly partitions on `start_time`
- `time_log_audit_events` — yearly partitions
- Compound PKs for PostgreSQL partition rules
- Cursor pagination: `id:startTime` — zero lookup

**Benefit:** partition pruning on timesheet queries; O(1) old data drop

---

## Engineering discipline

### Delivery order

`docs/specs/` → `contracts` → failing tests → API → FE → CI gate

### CI pipeline (4 stages)

| Job         | Validates                                     |
| ----------- | --------------------------------------------- |
| quality     | format, lint, typecheck, build, bundle budget |
| unit        | Vitest + coverage                             |
| integration | Postgres + Redis + Supertest                  |
| e2e         | Playwright — 19 specs across client + admin   |

**Deploy:** migrate → Railway API → Vercel → smoke checks

---

## Test pyramid

| Layer       | Count / scope                                        |
| ----------- | ---------------------------------------------------- |
| Unit        | api, contracts, ui, web-shared — 270+ tests          |
| Integration | API e2e with real DB                                 |
| Browser e2e | smoke, approvals, submissions, exports, timesheet, … |

**Pre-commit:** Husky + lint-staged + **tests required** on staged features

`pnpm test:dashboard` — local hub for coverage + Playwright reports

---

## Agentic-assisted development ⭐

**Cursor multi-agent factory** — not ad-hoc vibe coding

| Artifact                                | Role                                              |
| --------------------------------------- | ------------------------------------------------- |
| `.cursor/rules/master-orchestrator.mdc` | Contract-first, test-with-feature                 |
| `role-be` / `role-fe` / `role-qa`       | Directory bounds — parallel agents                |
| `.cursor/skills/*`                      | Delivery playbooks (API slice, FE feature, tests) |
| `TASK_BOARD.json`                       | Sprint state P1/P2 complete                       |
| `docs/specs/*.md`                       | Feature SSOT before code                          |

**Humans orchestrate · agents implement · CI judges**

---

## Case study — WebSocket notifications

| Step      | Deliverable                                           |
| --------- | ----------------------------------------------------- |
| Problem   | Admin approves; member stale up to 60s                |
| Contracts | `notification-realtime.ts`, scopes, templates         |
| API       | Gateway + Redis publisher on `createInApp`            |
| FE        | `notification-socket-manager` + `workspace-data-sync` |
| Tests     | gateway, client, web-shared, contracts specs          |
| Docs      | `notifications-realtime.md` + websocket plan          |

**Follow-up:** `tasks` scope for assign/unassign — same pattern, one PR

---

## Roadmap horizons

```
H0 Launch hardening  →  H1 Workflow excellence
        ↓                        ↓
H4 Platform & AI    ←  H3 Scale & external users
        ↑                        ↑
              H2 Finance & client value
```

**Rule:** don't start H3 until H0 exit criteria met

---

## H0 — Launch hardening (0–6 weeks)

**Goal:** Safe for pilot customers on production

| Initiative      | Deliverable                              |
| --------------- | ---------------------------------------- |
| Production gate | Rate limits on auth, export, heavy lists |
| Realtime ops    | WSS + Redis runbook; verify matrix       |
| Alerting        | Sentry DSN; error-rate alerts            |
| Merge train     | `dev` → `main` + full CI                 |

**Exit:** 2+ pilot workspaces · zero P0 bugs 2 weeks · realtime on prod

**Epic:** P3-01

---

## H1 — Workflow excellence (6–14 weeks)

| P0                          | P1                   | Engineering                 |
| --------------------------- | -------------------- | --------------------------- |
| Budget burn-down widget     | Project detail hub   | Audit log v1                |
| Budget / idle notifications | Member quick actions | Realtime e2e tests          |
|                             | Personal goals       | Workspace settings Zod SSOT |

**Realtime policy:** workflow + membership sync only — not every settings save

**Epics:** P3-02 · P3-03 · P3-04

---

## H2 — Finance & client value (3–6 months)

| Feature                | Value                           |
| ---------------------- | ------------------------------- |
| Utilization report     | Member × week vs expected hours |
| Invoice PDF v1         | Draft from billable export      |
| Scheduled export email | SMTP for `ExportSchedule`       |
| Period compare         | Month-over-month Δ              |
| Multi-currency spike   | GST/VAT — research first        |

**Epics:** P3-05 · P3-06

**Not building:** QuickBooks replacement — export-first only

---

## H3 — Scale & external users (6–12 months)

| Feature                    | Description                              |
| -------------------------- | ---------------------------------------- |
| **Client portal**          | External read-only login for client orgs |
| **PWA / mobile timer**     | Installable; offline queue phase 2       |
| **Cross-workspace export** | Agency multi-workspace                   |
| **Read replicas**          | Reporting off primary                    |
| **Email / push reminders** | Missing-time digests                     |

**Epics:** P3-08 · P3-09

---

## H4 — Platform & intelligence (12+ months)

| Theme        | Ideas                                                            |
| ------------ | ---------------------------------------------------------------- |
| Integrations | Outbound webhooks; deeper Jira sync; Zapier                      |
| AI           | Smart categorization worker; assistant with confirm-before-write |
| Marketplace  | Public API partners                                              |

**Explicitly deferred until H1–H2 stable**

**Epic:** P3-10

---

## Success metrics

| Metric                  | H0   | H1           |
| ----------------------- | ---- | ------------ |
| Pilot workspaces        | 3+   | 10+          |
| Weekly active loggers   | —    | 70% of seats |
| Submit → approve median | —    | <24h         |
| P0 incidents / month    | 0    | ≤1           |
| E2E pass on `main`      | 100% | 100%         |
| Socket connected %      | 80%  | 90%          |

---

## Risks & mitigations

| Risk                      | Mitigation                     |
| ------------------------- | ------------------------------ |
| Realtime silent failure   | Runbook + 60s poll safety net  |
| Export overload           | BullMQ queue + row limits      |
| Client portal scope creep | Auth spike before build        |
| Agent drift               | TASK_BOARD + MIP handoffs + CI |

---

## Out of scope (all horizons)

- AI categorization before audit log + utilization
- Full ERP / accounting replacement
- Cross-workspace billing consolidation
- Idle browser extension before PWA
- Live sync for cosmetic admin settings

---

## 40-min demo run-of-show

| Min   | Block                          |
| ----- | ------------------------------ |
| 0–3   | Hook & positioning             |
| 3–8   | Architecture + completeness    |
| 8–16  | Member app + **realtime hero** |
| 16–24 | Admin app                      |
| 24–30 | Technical deep dive (IDE)      |
| 30–35 | CI + tests + docs              |
| 35–40 | Agentic development + close    |

**Full script:** `docs/user-guides/demo-40min-script.md`

---

<!-- _class: lead -->

# Thank you

## Kloqra — built for agencies, shipped with discipline

**Docs:** `docs/architecture/KLOQRA_FUTURE_PLAN.md`  
**Demo:** `docs/user-guides/demo-40min-script.md`  
**API:** `docs/api/ROUTES.md`

Questions?
