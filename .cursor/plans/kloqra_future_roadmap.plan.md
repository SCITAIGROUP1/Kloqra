---
name: Kloqra future roadmap
overview: >-
  Master 2026–2027 plan for product horizons (H0–H4), engineering parallel track,
  epic queue, and success metrics. Canonical doc: docs/architecture/KLOQRA_FUTURE_PLAN.md
todos:
  - id: h0-prod-hardening
    content: "H0: Rate limits, Sentry alerts, WSS runbook, dev→main merge train"
    status: pending
  - id: h1-budget-burn
    content: "H1: Budget burn-down widget + budget.near/over notifications"
    status: pending
  - id: h1-project-hub
    content: "H1: Admin project detail hub + export shortcut"
    status: pending
  - id: h1-bulk-categories
    content: "H1: Finish bulk category import worker + e2e"
    status: pending
  - id: h1-audit-log
    content: "H1: Audit log v1 (approve, role, export, billing)"
    status: pending
  - id: h1-realtime-e2e
    content: "H1: Playwright e2e for approve→member sync and task assign"
    status: pending
  - id: h2-utilization-invoice
    content: "H2: Utilization report + invoice PDF v1"
    status: pending
  - id: h2-export-email
    content: "H2: Scheduled export SMTP delivery"
    status: pending
  - id: h3-client-portal
    content: "H3: Client portal spike + MVP (external read-only)"
    status: pending
  - id: h3-pwa
    content: "H3: PWA timer + offline queue"
    status: pending
  - id: h4-webhooks-ai
    content: "H4: Webhooks platform + AI categorization research"
    status: pending
isProject: true
---

# Kloqra future roadmap (agent index)

**Canonical plan:** [docs/architecture/KLOQRA_FUTURE_PLAN.md](../../docs/architecture/KLOQRA_FUTURE_PLAN.md)

Use this file for Cursor/agent orchestration. Update todos when epics start/complete.

---

## Horizon summary

| Horizon | Timeline | Theme |
| ------- | -------- | ----- |
| **H0** | 0–6 weeks | Launch hardening — pilots on prod |
| **H1** | 6–14 weeks | Workflow excellence — budget, project hub, audit |
| **H2** | 3–6 months | Finance & client value — utilization, invoice, email exports |
| **H3** | 6–12 months | Scale — client portal, PWA, partitioning |
| **H4** | 12+ months | Platform — webhooks, AI, deep integrations |

---

## Current baseline (do not re-build)

Phases 1–2 + level-up: timer, timesheet, approvals, exports, billing, reporting, presence, Jira, assistant, **realtime notifications** (tasks scope shipped on `dev`).

---

## H0 exit criteria

- [ ] 2+ pilot workspaces on production
- [ ] Rate limits verified on auth + export
- [ ] Prod WSS + Redis verified (manual matrix in notifications plan)
- [ ] Sentry alerting configured
- [ ] `dev` merged to `main` with green CI

---

## Next epic to pick (recommended)

**P3-01 — Production hardening** — smallest risk, unblocks pilots.

Handoff template:

```markdown
<AGENT_INSTRUCTION role="BE" task_id="P3-01">

- Read: docs/architecture/KLOQRA_FUTURE_PLAN.md § H0
- Target: apps/api rate limiting audit, docs/runbooks/
- TDD: extend throttler specs if gaps found
</AGENT_INSTRUCTION>
```

---

## Realtime policy (from websocket plan)

**Sync:** workflow events, project/task membership, approval settings.  
**Defer:** workspace settings broadcast, cosmetic project fields.

See [websocket_notifications_guide.plan.md](./websocket_notifications_guide.plan.md).

---

## TASK_BOARD phase 3 epics

| ID | Title | Horizon |
| -- | ----- | ------- |
| P3-01 | Production hardening | H0 |
| P3-02 | Budget burn-down + alerts | H1 |
| P3-03 | Project detail hub | H1 |
| P3-04 | Audit log v1 | H1 |
| P3-05 | Bulk category import | H1 |
| P3-06 | Utilization + invoice v1 | H2 |
| P3-07 | Scheduled export email | H2 |
| P3-08 | Client portal | H3 |
| P3-09 | PWA + offline | H3 |
| P3-10 | Webhooks platform | H4 |

Add to `TASK_BOARD.json` when H0 work officially starts.
