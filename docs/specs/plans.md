# Plans and subscription catalog

## User-visible outcome

- Every organization has a **subscription** row linked to a **plan** from the catalog.
- Tenant owners see plan name, status, and limits on Account overview and Billing.
- **No payments** in F09 — Stripe wiring is F11; limit enforcement is F10.

## Architecture docs

| Doc                                                              | Content                                |
| ---------------------------------------------------------------- | -------------------------------------- |
| [SAAS_PLATFORM_PLAN.md](../architecture/SAAS_PLATFORM_PLAN.md)   | F09–F13 epics                          |
| [TENANT_DOMAIN_MODEL.md](../architecture/TENANT_DOMAIN_MODEL.md) | `plans`, `tenant_subscriptions` tables |

## Contracts

| Artifact                    | Path                                                            |
| --------------------------- | --------------------------------------------------------------- |
| Plan slugs + default limits | [plan-catalog.ts](../../packages/contracts/src/plan-catalog.ts) |
| Limits schema               | [tenant-rbac.ts](../../packages/contracts/src/tenant-rbac.ts)   |
| Subscription DTO            | [tenant.dto.ts](../../packages/contracts/src/dto/tenant.dto.ts) |
| Route                       | `ROUTES.TENANTS.SUBSCRIPTION`                                   |

## Where plan config and prices live

Platform staff **manage the catalog** from platform-admin **Plans**. Runtime source of truth is the `plans` table.

| Layer                     | File / table                                                   | What it holds                                                                                      |
| ------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Stable seed IDs**       | `packages/contracts/src/plan-catalog.ts`                       | `PLAN_SLUGS`, `PLAN_IDS`, `DEFAULT_PLAN_LIMITS` (bootstrap only)                                   |
| **Limits schema**         | `packages/contracts/src/tenant-rbac.ts`                        | `planLimitsSchema` field definitions                                                               |
| **Database (SSOT)**       | `plans` table                                                  | Limits, Stripe IDs, marketing copy, display prices, **tier-specific** `features`, visibility flags |
| **Common pricing basics** | `platform_catalog_settings.pricing_baseline_features`          | Shared bullets on every billing card (edited on platform-admin **Plans**)                          |
| **Seed**                  | `apps/api/prisma/seed-data.ts` → `SEED_PLANS`                  | Initial rows + Stripe ID env mapping                                                               |
| **Stripe env**            | `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRODUCT_*` | Overrides on seed — see [ENVIRONMENT.md](../development/ENVIRONMENT.md)                            |
| **Owner pricing UI**      | `GET /plans/pricing`                                           | Reads `visible_on_pricing` plans from DB                                                           |
| **Self-serve signup**     | `GET /plans/public`                                            | Reads `is_public` plans from DB                                                                    |
| **Per-tenant override**   | `tenant_subscriptions.limits_override`                         | Enterprise caps via `PATCH /platform/tenants/:id`                                                  |

**Important:** Display prices in the DB (`monthly_price_cents`, `yearly_price_cents`) are for marketing. **Active plan for each tenant** is always `tenant_subscriptions.plan_id` (join `plans` for limits and name). Stripe `stripe_price_id` is required only for real Checkout; simulated billing updates `plan_id` directly.

Platform staff edit catalog via `PATCH /platform/plans/:id` (audited as `platform.plan.updated`).

## Catalog (seeded)

| Slug      | Name    | Public | Limits (provisional — D11) |
| --------- | ------- | ------ | -------------------------- |
| `pilot`   | Pilot   | no     | 25 workspaces, 100 seats   |
| `starter` | Starter | yes    | 3 workspaces, 10 seats     |
| `pro`     | Pro     | yes    | 10 workspaces, 50 seats    |

**Enterprise:** assign `pro` plan + set `tenant_subscriptions.limits_override` JSON (e.g. higher `maxSeats`). Effective limits = merge(plan.limits, limits_override).

## API

| Method | Route                         | Roles                                 |
| ------ | ----------------------------- | ------------------------------------- |
| GET    | `ROUTES.TENANTS.SUBSCRIPTION` | Tenant owner                          |
| PATCH  | `ROUTES.TENANTS.SUBSCRIPTION` | Tenant owner (simulated billing only) |
| GET    | `ROUTES.TENANTS.OVERVIEW`     | Tenant owner (includes subscription)  |

## Given / When / Then

**When** seed or migration runs  
**Then** catalog plans exist and every tenant has a `tenant_subscriptions` row (demo tenant → `pilot`, `active`).

**When** tenant owner calls `GET /tenants/current/subscription`  
**Then** response includes `planName`, `status`, `limits` with merged override.

**When** tenant admin calls subscription route  
**Then** **403**.

## Limit enforcement (F10)

**Seat count:** distinct active users in `tenant_members` ∪ `workspace_members` for the tenant's workspaces.

**Grandfather rule:** existing workspaces and members are not removed when over cap; only **new** creates/invites are blocked at 100%.

**Enforced on:**

| Action                  | Route / service                                   |
| ----------------------- | ------------------------------------------------- |
| Create workspace        | `POST ROUTES.TENANTS.WORKSPACES`                  |
| Invite workspace member | `WorkspaceService.invite`                         |
| Assign workspace admin  | `POST ROUTES.WORKSPACES.ASSIGN_ADMIN`             |
| Bulk invite             | `POST ROUTES.WORKSPACES.BULK_MEMBERS` (pre-queue) |
| Invite tenant admin     | `POST ROUTES.TENANTS.MEMBERS`                     |

**Error:** `402` with `PLAN_LIMIT_EXCEEDED` and `details: { limit, current, max }`.

## Tests

- Unit: `plan-limit.service.spec.ts`, `subscriptions.service.spec.ts`, `plan-catalog.spec.ts`, `subscription-sync.service.spec.ts`
- E2E: `tenants.e2e.ts`, `plan-limits.e2e.ts`, `subscription-lifecycle.e2e.ts`, `subscription-plan-change.e2e.ts`, `stripe-webhook.e2e.ts`
- Playwright: `apps/admin/e2e/account-billing.spec.ts`

## Stripe upgrade path (F11–F13)

- `plans.stripe_price_id` / `stripe_product_id` seeded for `starter` and `pro` (env overrides).
- Owner upgrades via `POST ROUTES.TENANTS.CHECKOUT`; manage via `POST ROUTES.TENANTS.PORTAL`.
- See [subscriptions.md](./subscriptions.md) for webhooks and lifecycle.

## Deferred

- ~~F10 — enforce `maxWorkspaces` / `maxSeats` on create + invite~~ **implemented (F10)**
- ~~F11 — Stripe products, webhooks, `stripe_*` columns~~ **implemented (F11)**
- ~~F13 — Customer Portal, upgrade UX~~ **implemented (F13)**
- F14/F15 — platform-admin plan assignment UI
- Public `GET /plans` listing endpoint
