# Platform ops (SaaS-F22)

Fleet-wide observability for platform staff — distinct from tenant-owner rollup analytics ([tenant-analytics.md](./tenant-analytics.md)).

## API

| Method | Route                                                   | Access              |
| ------ | ------------------------------------------------------- | ------------------- |
| GET    | `ROUTES.PLATFORM.OPS_SUMMARY` (`/platform/ops/summary`) | Platform superadmin |

### Response (`PlatformOpsSummaryDto`)

- `tenants` — org counts: `active`, `trial` (subscriptions on trial), `suspended`, `churned`, `pendingSetup`
- `subscriptions` — `active`, `trial`, `pastDue`, `canceled`
- `usage` — `totalWorkspaces`, `totalSeats` (distinct users across tenant + workspace membership)
- `queues` — global BullMQ depth per queue (`waiting`, `active`, `failed`, `delayed`)
- `mrr` — `{ currency: "usd", amountCents, source: "stripe" }` or `null` when Stripe is not configured
- `reconcile` — `{ driftCount, lastCheckedAt }` comparing internal `tenant_subscriptions` vs Stripe status

## Error observability

API 5xx events sent to Sentry include tags:

- `tenantId`, `workspaceId`, `userId`, `requestId`
- `extra.subscriptionStatus` when `tenantId` is present

Railway HTTP logs include `tenantId` / `userId` on authenticated requests.

## UI

- **platform-admin** → **Ops** (`/ops`)
- Stat cards: active tenants, trial, past due, MRR, seats, failed jobs
- Queue depth table

## On-call

See [on-call-tenant-triage.md](../runbooks/on-call-tenant-triage.md).

## Tests

- `apps/api/src/modules/platform/application/platform-ops.service.spec.ts`
- `apps/api/test/platform-ops.e2e.ts`
- `apps/api/src/common/http/sentry-context.util.spec.ts`
- `apps/platform-admin/e2e/ops.spec.ts`

## Out of scope (v1)

- Per-tenant queue metrics
- Prometheus `/metrics` endpoint
- Automated paging
