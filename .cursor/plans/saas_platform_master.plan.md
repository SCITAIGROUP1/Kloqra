---
name: SaaS platform master plan
overview: >-
  B2B multi-tenant SaaS transformation: Tenant → Workspaces → Projects.
  Research-gated epics (F00–F24) before implementation. Canonical doc:
  docs/architecture/SAAS_PLATFORM_PLAN.md
todos:
  - id: saas-f00
    content: "F00: Program kickoff — fill D01–D10 decision log, assign owners"
    status: completed
  - id: saas-f01
    content: "F01: Domain model & terminology RFC (TENANT_DOMAIN_MODEL.md)"
    status: completed
  - id: saas-f02
    content: "F02: Tenant schema + migration + backfill pilots"
    status: pending
  - id: saas-f03
    content: "F03: RBAC permission matrix (TENANT_RBAC.md)"
    status: completed
  - id: saas-f04
    content: "F04: Auth JWT tenant claims + TenantGuard + switch-workspace check"
    status: pending
  - id: saas-f05
    content: "F05: Data isolation E2E + SECURITY.md tenant section"
    status: pending
  - id: saas-f06
    content: "F06: Tenant membership API (tenants module)"
    status: pending
  - id: saas-f07
    content: "F07: Workspace lifecycle tenant-scoped (restrict POST /workspaces)"
    status: pending
  - id: saas-f08
    content: "F08: Account UI in admin app (tenant owner home)"
    status: pending
  - id: saas-f09
    content: "F09: Plan catalog schema (no Stripe yet)"
    status: pending
  - id: saas-f10
    content: "F10: PlanLimitGuard enforcement"
    status: pending
  - id: saas-f11
    content: "F11: Stripe integration + webhooks"
    status: pending
  - id: saas-f12
    content: "F12: Subscription lifecycle state machine"
    status: pending
  - id: saas-f13
    content: "F13: Billing UX — Account billing tab + Customer Portal"
    status: pending
  - id: saas-f14
    content: "F14: platform-admin app scaffold"
    status: pending
  - id: saas-f15
    content: "F15: Superadmin tenant CRUD + suspend"
    status: pending
  - id: saas-f16
    content: "F16: Platform audit log only — no superadmin impersonation (D13)"
    status: pending
  - id: saas-f17
    content: "F17: Project lead (team_members.role LEAD)"
    status: pending
  - id: saas-f18
    content: "F18: Tenant rollup dashboard (read-only)"
    status: pending
  - id: saas-f19
    content: "F19: Tenant-scoped public API keys"
    status: pending
  - id: saas-f20
    content: "F20: Self-serve signup + onboarding (optional)"
    status: pending
  - id: saas-f21
    content: "F21: Pilot data migration runbook"
    status: pending
  - id: saas-f22
    content: "F22: Observability + tenant metrics"
    status: pending
  - id: saas-f23
    content: "F23: Legal/compliance pack before paid launch"
    status: pending
  - id: saas-f24
    content: "F24: SaaS E2E test suite in CI"
    status: pending
isProject: true
---

# SaaS platform master plan (agent index)

**Canonical plan:** [docs/architecture/SAAS_PLATFORM_PLAN.md](../../docs/architecture/SAAS_PLATFORM_PLAN.md)

## Rules

1. **No implementation** until an epic’s **research gate** is `DONE` and signed off.
2. **Contract-first** per [chronomint-feature-delivery skill](../skills/chronomint-feature-delivery/SKILL.md).
3. **P1 before P3** — tenant isolation before Stripe.
4. **H0 hardening** on current roadmap is not blocked, but don’t ship paid SaaS before F05 + F21.
5. **One epic in flight** — see [§7.3 continuity](SAAS_PLATFORM_PLAN.md) in canonical doc.
6. **Dual track** — H0–H2 product work continues on `dev`; SaaS merges as small PRs, not a mega-branch.

## Continuity (quick reference)

| Do | Don't |
| -- | ----- |
| One epic → 1–4 PRs → merge `dev` | Single "SaaS v1" PR |
| Update TASK_BOARD + plan checkboxes each epic | Lose context between sessions |
| F05 green before F06+ | Skip isolation E2E |
| Backfill pilots in F21 before NOT NULL | Break existing workspaces mid-migration |
| Handoff template at session start/end | Start F11 Stripe before P1 milestone |

Full detail: [SAAS_PLATFORM_PLAN.md §7.3](../../docs/architecture/SAAS_PLATFORM_PLAN.md).

## Phase map

| Phase | Epics | Theme |
| ----- | ----- | ----- |
| P0 | F00 | Decisions |
| P1 | F01–F07, F21 | Tenant core |
| P2 | F08–F10 | Account UI + limits |
| P3 | F11–F13, F20, F23 | Payments |
| P4 | F14–F16 | Platform admin |
| P5 | F17 | Project lead |
| P6 | F18–F19, F22, F24 | Scale |

## Start next session with

```markdown
<AGENT_INSTRUCTION role="LSA" task_id="SaaS-F01">

- Read: docs/architecture/SAAS_PLATFORM_PLAN.md § F01
- Deliver: docs/architecture/TENANT_DOMAIN_MODEL.md draft
- Block: no Prisma changes until F01 research gate DONE

</AGENT_INSTRUCTION>
```

## Decision log

Track in SAAS_PLATFORM_PLAN.md §7 (D01–D16). **D01–D08, D11–D16 decided** (June 2026). Open: D09, D10, D11 tier numbers.
