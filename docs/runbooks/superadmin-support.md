# Superadmin support (no impersonation)

Platform staff use `apps/platform-admin` to manage tenant metadata. **Platform users cannot impersonate tenant members** (decision D13).

Full action catalog and API reference: [platform-admin.md](../specs/platform-admin.md).

## Triage flow

1. Confirm the tenant in **Tenants** — note `status`, plan, workspace/member counts, owner email.
2. Check **Audit log** for recent platform actions (`platform.tenant.*`, `platform.login`).
3. Check **Ops** for fleet-wide issues (queue failures, subscription drift, past-due counts).
4. Ask the **tenant owner** to reproduce the issue while screen-sharing, or to export data from the admin app (Exports).
5. Escalate to engineering with tenant ID, audit event IDs, and timestamps.

## What platform staff can do

### Tenant lifecycle

| Action                                             | Where                        | API                                               |
| -------------------------------------------------- | ---------------------------- | ------------------------------------------------- |
| List / search / filter tenants                     | Tenants                      | `GET /platform/tenants`                           |
| Provision tenant + owner (+ optional tenant admin) | Tenants → Create tenant      | `POST /platform/tenants`                          |
| View tenant metadata                               | Tenant detail                | `GET /platform/tenants/:id`                       |
| Update name, slug, plan                            | Tenant detail → Save         | `PATCH /platform/tenants/:id`                     |
| Suspend                                            | Tenant detail → Suspend      | `POST /platform/tenants/:id/suspend`              |
| Reactivate                                         | Tenant detail → Reactivate   | `PATCH /platform/tenants/:id`                     |
| Mark churned                                       | Tenant detail → Mark churned | `PATCH /platform/tenants/:id`                     |
| Delete permanently (churned + export rules)        | Tenant detail                | `DELETE /platform/tenants/:id`                    |
| Assign plan at create                              | Create tenant modal          | `planId` on `POST /platform/tenants`              |
| Override limits (enterprise)                       | API only today               | `limitsOverride` on `PATCH /platform/tenants/:id` |

### Operations & compliance

| Action                             | Where                       | API                           |
| ---------------------------------- | --------------------------- | ----------------------------- |
| Fleet health (counts, MRR, queues) | Ops                         | `GET /platform/ops/summary`   |
| Review staff actions               | Audit log                   | `GET /platform/audit-events`  |
| Staff notifications                | Notifications / header bell | `GET /platform/notifications` |

### Own account

| Action                           | Where              | API              |
| -------------------------------- | ------------------ | ---------------- |
| Profile, password, 2FA, sessions | Profile / Settings | `/platform/me/*` |

## What platform staff cannot do

- Log in as a tenant user or workspace member
- View customer timesheets, projects, or workspace data
- Edit plan **prices** or marketing copy (see [plans.md](../specs/plans.md) — prices live in Stripe + `plan-pricing-catalog.ts`)
- Access tenant routes with a platform JWT (returns 401)

## Audit log retention

Events are stored indefinitely in `platform_audit_events`. Ops may archive rows older than 24 months via a future maintenance job; do not delete rows manually without legal review.

## Related

- [on-call-tenant-triage.md](./on-call-tenant-triage.md) — Sentry/Railway tenant lookup, subscription triage
- [tenant-churn.md](./tenant-churn.md) — offboarding workflow
- [platform-admin.md](../specs/platform-admin.md) — full action catalog and RBAC boundary
