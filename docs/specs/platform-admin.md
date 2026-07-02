# Platform admin (SaaS-F14+)

Internal Kloqra staff console at `apps/platform-admin` (port **3003** locally).

## Auth

| Setting | Value                                             |
| ------- | ------------------------------------------------- |
| App     | `apps/platform-admin`                             |
| Scope   | `NEXT_PUBLIC_AUTH_SCOPE=platform`                 |
| Cookies | `access_token_platform`, `refresh_token_platform` |
| JWT     | `typ: "platform"`, `platformRole: SUPERADMIN`     |
| Users   | `platform_users` table (not tenant `users`)       |

Login uses `POST /auth/login` with `X-Auth-Scope: platform`. Tenant member credentials are rejected unless a matching `platform_users` row exists.

First sign-in requires mandatory TOTP setup (`/setup-2fa`) before tenant ops routes are usable.

## RBAC boundary

Platform staff operate on a **separate auth plane** from tenant users:

| Allowed                                                             | Blocked                                     |
| ------------------------------------------------------------------- | ------------------------------------------- |
| Tenant lifecycle (create, update, suspend, churn, delete)           | Impersonate tenant users (D13)              |
| Tenant **metadata** (name, slug, status, plan, counts, owner email) | Workspaces, projects, tasks, time entries   |
| Fleet ops aggregates (MRR, seat totals, queue health)               | Tenant analytics, billing checkout as owner |
| Platform staff audit log and notifications                          | Any route using tenant JWT (`typ: access`)  |

Enforcement: `PlatformGuard` on `/platform/*`; `verifyPlatformAccessToken` vs `verifyAccessToken` token-type separation. See [TENANT_RBAC.md](../architecture/TENANT_RBAC.md) §2 and [superadmin-support.md](../runbooks/superadmin-support.md).

## Console navigation

| Nav item            | Route                      | Purpose                                                            |
| ------------------- | -------------------------- | ------------------------------------------------------------------ |
| Ops                 | `/ops`                     | Fleet health dashboard                                             |
| Tenants             | `/tenants`                 | List, search, filter, create tenants                               |
| Subscriptions       | `/subscriptions`           | Fleet-wide billing cycles, work-queue, and Stripe drift management |
| Subscription detail | `/subscriptions/:tenantId` | View detailed subscription state and immutable timeline            |
| Tenant detail       | `/tenants/:id`             | View metadata; suspend, reactivate, churn, delete                  |
| Audit log           | `/audit`                   | Immutable platform staff action log                                |
| Plans               | `/plans`                   | List and edit catalog (limits, Stripe IDs, pricing copy)           |
| Profile             | `/profile`                 | Name, email display                                                |
| Settings            | `/settings`                | Password, 2FA, sessions, appearance                                |

## Platform admin actions (complete)

### Authentication (unauthenticated / auth routes)

| Action                       | UI / route         | API                                                                              | Audited                                         |
| ---------------------------- | ------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| Login                        | `/login`           | `POST /auth/login` (`X-Auth-Scope: platform`)                                    | `platform.login`                                |
| Complete mandatory 2FA setup | `/setup-2fa`       | `POST /auth/platform/2fa-setup/enable`, `POST /auth/platform/complete-2fa-setup` | `platform.2fa.enabled`                          |
| Forgot password              | `/forgot-password` | `POST /auth/forgot-password` (`X-Auth-Scope: platform`)                          | —                                               |
| Reset password               | `/reset-password`  | `POST /auth/reset-password`                                                      | — (contract reserves `platform.password.reset`) |
| Refresh session              | —                  | `POST /auth/refresh` (`X-Auth-Scope: platform`)                                  | —                                               |
| Log out                      | Shell footer       | `POST /auth/logout`                                                              | —                                               |

### Console — tenants

| Action                                     | UI                           | API                                               | Audited                     |
| ------------------------------------------ | ---------------------------- | ------------------------------------------------- | --------------------------- |
| List tenants (search, filters, pagination) | `/tenants`                   | `GET /platform/tenants`                           | —                           |
| View tenant detail                         | `/tenants/:id`               | `GET /platform/tenants/:id`                       | —                           |
| Create tenant                              | Create tenant modal          | `POST /platform/tenants`                          | `platform.tenant.created`   |
| Update name / slug / plan                  | Tenant detail → Save         | `PATCH /platform/tenants/:id`                     | `platform.tenant.updated`   |
| Suspend tenant                             | Tenant detail → Suspend      | `POST /platform/tenants/:id/suspend`              | `platform.tenant.suspended` |
| Reactivate tenant                          | Tenant detail → Reactivate   | `PATCH /platform/tenants/:id` (`status: active`)  | `platform.tenant.updated`   |
| Mark churned                               | Tenant detail → Mark churned | `PATCH /platform/tenants/:id` (`status: churned`) | `platform.tenant.churned`   |
| Delete permanently                         | Tenant detail (churned only) | `DELETE /platform/tenants/:id`                    | `platform.tenant.deleted`   |
| List plans (picker)                        | Create tenant modal          | `GET /platform/plans`                             | —                           |

**Create tenant provisions:** organization, owner account (temp password email), optional tenant admin (`tenant_members.ADMIN`), subscription on selected plan, trial or active status. Does **not** expose plan price editing.

**PATCH fields available to platform** (API; not all exposed in UI): `name`, `slug`, `status`, `planId`, `subscriptionStatus`, `limitsOverride`, `exportWaived`.

### Console — ops

| Action             | UI     | API                         | Audited |
| ------------------ | ------ | --------------------------- | ------- |
| View fleet summary | `/ops` | `GET /platform/ops/summary` | —       |

Returns aggregate tenant/subscription counts, total workspaces/seats, Stripe MRR, queue depths, subscription drift count. No per-tenant operational data.

### Console — audit log

| Action                       | UI       | API                                       | Audited |
| ---------------------------- | -------- | ----------------------------------------- | ------- |
| List audit events            | `/audit` | `GET /platform/audit-events`              | —       |
| Filter by action / tenant ID | `/audit` | query: `action`, `tenantId`, `from`, `to` | —       |

Recorded actions (`platformAuditActionSchema`):

- `platform.login`
- `platform.2fa.enabled`, `platform.2fa.disabled`
- `platform.password.reset` (reserved)
- `platform.tenant.created`, `platform.tenant.updated`, `platform.tenant.suspended`, `platform.tenant.churned`, `platform.tenant.deleted`

### Console — subscriptions

| Action                                           | UI                                | API                                                                             | Audited                                                          |
| ------------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| List subscriptions (search, filters, pagination) | `/subscriptions`                  | `GET /platform/subscriptions`                                                   | —                                                                |
| View subscription detail                         | `/subscriptions/:tenantId`        | `GET /platform/subscriptions/:tenantId`                                         | —                                                                |
| View work queue and counts                       | `/subscriptions/work-queue`       | `GET /platform/subscriptions/work-queue`                                        | —                                                                |
| View subscription events                         | `/subscriptions/:tenantId/events` | `GET /platform/subscriptions/:tenantId/events`                                  | —                                                                |
| Assign plan (manual override)                    | Detail / List Action              | `PATCH /platform/tenants/:id`                                                   | `platform.tenant.updated` (records subscription lifecycle event) |
| Send payment instructions                        | List Action                       | `POST /platform/tenants/:tenantId/sales-inquiries/:inquiryId/send-instructions` | —                                                                |

### Console — plans

| Action           | UI           | API                             | Audited                 |
| ---------------- | ------------ | ------------------------------- | ----------------------- |
| List plans       | `/plans`     | `GET /platform/plans`           | —                       |
| Edit plan config | `/plans/:id` | `GET/PATCH /platform/plans/:id` | `platform.plan.updated` |

### Console — notifications

| Action                    | UI                 | API                                                                               | Audited |
| ------------------------- | ------------------ | --------------------------------------------------------------------------------- | ------- |
| List notifications        | `/notifications`   | `GET /platform/notifications`                                                     | —       |
| Unread count              | Header bell        | `GET /platform/notifications/unread-count`                                        | —       |
| Mark read / mark all read | Notifications page | `PATCH /platform/notifications/:id`, `POST /platform/notifications/mark-all-read` | —       |

### Account — profile & security

| Action                                      | UI          | API                                        | Audited                 |
| ------------------------------------------- | ----------- | ------------------------------------------ | ----------------------- |
| View profile                                | `/profile`  | `GET /platform/me`                         | —                       |
| Update name                                 | `/profile`  | `PATCH /platform/me`                       | —                       |
| Update preferences (theme, security alerts) | `/settings` | `PATCH /platform/me/preferences`           | —                       |
| Change password                             | `/settings` | `POST /platform/me/password`               | —                       |
| List sessions                               | `/settings` | `GET /platform/me/sessions`                | —                       |
| Revoke session                              | `/settings` | `DELETE /platform/me/sessions/:id`         | —                       |
| Revoke other sessions                       | `/settings` | `POST /platform/me/sessions/revoke-others` | —                       |
| Enable 2FA                                  | `/settings` | `POST /platform/me/2fa/enable`             | —                       |
| Verify 2FA                                  | `/settings` | `POST /platform/me/2fa/verify`             | `platform.2fa.enabled`  |
| Disable 2FA                                 | `/settings` | `POST /platform/me/2fa/disable`            | `platform.2fa.disabled` |

## Plan catalog vs prices (platform-admin managed)

Platform staff **manage the full plan catalog** from **Plans** in the console. The `plans` table is the runtime source of truth for limits, Stripe IDs, marketing copy, and pricing display amounts.

| Concern                       | Location                                             | Managed in platform-admin          |
| ----------------------------- | ---------------------------------------------------- | ---------------------------------- |
| Plan slugs + seed UUIDs       | `packages/contracts/src/plan-catalog.ts`             | Read-only (stable IDs)             |
| Limits schema                 | `packages/contracts/src/tenant-rbac.ts`              | —                                  |
| **Catalog rows**              | `plans` table                                        | **Yes** — `/plans` list + edit     |
| Stripe product/price IDs      | `plans.stripe_*` columns                             | **Yes**                            |
| Display prices (cents)        | `plans.monthly_price_cents`, `yearly_price_cents`    | **Yes**                            |
| Marketing copy                | `tagline`, `features`, `recommended`, `billing_mode` | **Yes**                            |
| Self-serve signup visibility  | `is_public`                                          | **Yes**                            |
| Owner pricing page visibility | `visible_on_pricing`                                 | **Yes**                            |
| Tenant owner billing UI       | `GET /plans/pricing`                                 | Indirect (reads DB)                |
| Stripe Checkout charges       | `stripe_price_id` in DB                              | Keep in sync with Stripe Dashboard |

**API:** `GET/PATCH /platform/plans/:id` (audited as `platform.plan.updated`). Public signup still uses `GET /plans/public` (`is_public` only). Owner billing uses `GET /plans/pricing` (`visible_on_pricing`).

`packages/contracts/src/plan-catalog.ts` retains `PLAN_IDS` and `DEFAULT_PLAN_LIMITS` for seeds and tests only — not for runtime edits.

See [plans.md](./plans.md) for subscription lifecycle and limit enforcement.

## API reference (all `PlatformGuard` routes)

| Method | Route                                                                  | Purpose                                                                      |
| ------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| GET    | `/platform/tenants`                                                    | Paginated tenant list (`search`, `status`, `planSlug`, `subscriptionStatus`) |
| POST   | `/platform/tenants`                                                    | Provision tenant                                                             |
| GET    | `/platform/tenants/:id`                                                | Tenant detail                                                                |
| PATCH  | `/platform/tenants/:id`                                                | Update tenant / subscription                                                 |
| POST   | `/platform/tenants/:id/suspend`                                        | Suspend                                                                      |
| DELETE | `/platform/tenants/:id`                                                | Permanent delete (churned + export preconditions)                            |
| GET    | `/platform/plans`                                                      | Plan catalog                                                                 |
| GET    | `/platform/plans/:id`                                                  | Plan detail                                                                  |
| PATCH  | `/platform/plans/:id`                                                  | Update plan config                                                           |
| GET    | `/platform/ops/summary`                                                | Fleet ops dashboard                                                          |
| GET    | `/platform/audit-events`                                               | Audit log                                                                    |
| GET    | `/platform/me`                                                         | Profile                                                                      |
| PATCH  | `/platform/me`                                                         | Update profile                                                               |
| PATCH  | `/platform/me/preferences`                                             | Theme / notification prefs                                                   |
| POST   | `/platform/me/password`                                                | Change password                                                              |
| GET    | `/platform/me/sessions`                                                | List sessions                                                                |
| DELETE | `/platform/me/sessions/:id`                                            | Revoke session                                                               |
| POST   | `/platform/me/sessions/revoke-others`                                  | Revoke other sessions                                                        |
| POST   | `/platform/me/2fa/enable`                                              | Start 2FA setup                                                              |
| POST   | `/platform/me/2fa/verify`                                              | Confirm 2FA                                                                  |
| POST   | `/platform/me/2fa/disable`                                             | Disable 2FA                                                                  |
| GET    | `/platform/notifications`                                              | List notifications                                                           |
| GET    | `/platform/notifications/unread-count`                                 | Unread badge                                                                 |
| PATCH  | `/platform/notifications/:id`                                          | Mark read                                                                    |
| POST   | `/platform/notifications/mark-all-read`                                | Mark all read                                                                |
| GET    | `/platform/tenants/:id/sales-inquiries`                                | List contact-sales inquiries                                                 |
| POST   | `/platform/tenants/:id/sales-inquiries/:inquiryId/send-instructions`   | Email payment instructions to tenant owner                                   |
| GET    | `/platform/tenants/:id/sales-inquiries/:inquiryId/receipts/:receiptId` | Download uploaded receipt                                                    |

### Manual Enterprise fulfillment (contact sales)

1. Tenant owner submits inquiry from **Account → Billing** (Enterprise card).
2. Superadmin sees `SALES_INQUIRY` on **Notifications** or **Tenant detail → Sales inquiries**.
3. Click **Send payment instructions** (uses `BILLING_MANUAL_PAYMENT_INSTRUCTIONS` env copy).
4. Tenant uploads receipt on billing page; superadmin gets `SALES_RECEIPT_UPLOADED`.
5. On tenant detail, set **Plan** to Enterprise and **Save** — inquiry marked fulfilled, owner emailed.

**No platform impersonation** (D13). Workspace admin impersonation remains on `POST /auth/impersonate` only.

## Local dev

```bash
pnpm dev:api          # :3001
pnpm dev:platform     # :3003
pnpm prisma:seed      # seeds platform@kloqra.dev / password123
```

Ensure `FRONTEND_ORIGIN` includes `http://localhost:3003`.

## Deploy runbook (stub)

- Separate Vercel project or internal Railway service — **not** the customer admin URL.
- Set `NEXT_PUBLIC_AUTH_SCOPE=platform`, `NEXT_PUBLIC_API_BASE_URL` to production API.
- `robots.txt` disallows all paths.
- Restrict access via VPN / IP allowlist on staging (production gate TBD).

## Support runbooks

- [superadmin-support.md](../runbooks/superadmin-support.md)
- [tenant-churn.md](../runbooks/tenant-churn.md)

## Tests

- API: `platform-auth.e2e.ts`, `platform-tenants.e2e.ts`, `platform-tenants-provision.e2e.ts`, `platform-tenants-suspend.e2e.ts`, `platform-tenant-delete.e2e.ts`, `platform-audit.e2e.ts`, `platform-ops.e2e.ts`, `platform-profile.e2e.ts`, `platform-notifications.e2e.ts`, `sales-inquiry.e2e.ts`
- UI: `apps/platform-admin/e2e/platform-login.spec.ts`, `platform-create-tenant.spec.ts`, `platform-audit.spec.ts`, `platform-account.spec.ts`, `platform-auth-security.spec.ts`
