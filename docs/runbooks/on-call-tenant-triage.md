# On-call tenant triage (SaaS-F22)

How platform staff identify and resolve tenant-scoped incidents in under two minutes.

## 1. Find the tenant

| Source               | What to look for                                                                    |
| -------------------- | ----------------------------------------------------------------------------------- |
| **Sentry** (API 5xx) | Tags: `tenantId`, `workspaceId`, `userId`, `requestId`; extra: `subscriptionStatus` |
| **Railway logs**     | JSON field `tenantId` on authenticated requests (see `HTTP` logger)                 |
| **Platform admin**   | Tenants → search by owner email or org name                                         |
| **Audit log**        | `platform.tenant.*` events with `tenantId`                                          |

If only `workspaceId` is known, look up `workspaces.tenant_id` in the database or open the workspace in admin and infer org from the workspace switcher (same tenant only).

## 2. Check subscription health

1. Open **platform-admin** → tenant detail, or `GET /platform/tenants/:id`.
2. Note `subscription.status`: `active`, `trial`, `past_due`, `canceled`, `suspended`.
3. Open **Ops** (`/ops`) for fleet-wide `pastDue` count and **MRR reconcile drift**.

| Status      | Typical action                                                                              |
| ----------- | ------------------------------------------------------------------------------------------- |
| `past_due`  | Owner uses Account → Billing → manage subscription; verify Stripe webhooks                  |
| `trial`     | Normal for new signups; confirm trial end date                                              |
| `suspended` | Platform suspend — owner cannot write; see [superadmin-support.md](./superadmin-support.md) |
| `canceled`  | Billing ended — confirm churn workflow                                                      |

## 3. Payment / billing issues

- Stripe Dashboard → Customer by `stripeCustomerId` on tenant subscription
- API webhooks: `POST /webhooks/stripe` — check `stripe_webhook_events` for recent failures
- Reconcile drift on **Ops** page → run manual sync or fix webhook delivery

## 4. Suspend vs churn

- **Suspend** — temporary; reverses with platform unsuspend
- **Churn** — permanent offboarding; follow [tenant-churn.md](./tenant-churn.md)

## 5. Queue backlog

Check **Ops** → queue failed counts:

| Queue                 | Typical cause                      |
| --------------------- | ---------------------------------- |
| `mail-queue`          | SMTP / Brevo misconfiguration      |
| `bulk-invite-queue`   | Invalid emails or plan seat limits |
| `bulk-category-queue` | Bad CSV import                     |
| `export-queue`        | Large export timeout               |

Retry failed jobs in Redis/BullMQ admin or re-trigger from the UI.

## 6. Escalation checklist

Include in engineering tickets:

- `tenantId`, `workspaceId`, `requestId`
- Tenant `status` + subscription `status`
- Sentry event link or Railway log snippet
- Recent platform audit events for the tenant

## Related

- [superadmin-support.md](./superadmin-support.md) — platform staff capabilities (no impersonation)
- [tenant-churn.md](./tenant-churn.md) — offboarding
- [tenant-migration.md](./tenant-migration.md) — pilot org migration
- [docs/specs/platform-ops.md](../specs/platform-ops.md) — Ops API reference
