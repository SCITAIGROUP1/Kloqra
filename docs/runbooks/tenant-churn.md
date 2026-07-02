# Tenant churn runbook

Safe offboarding for a customer organization. Default path ends at `churned` status; **permanent deletion** is a separate F23 step after retention.

## Preconditions

- Tenant is **suspended** (`POST /platform/tenants/:id/suspend` or `PATCH` with `status: suspended`)
- Stripe subscription canceled (if `stripeSubscriptionId` is set)
- Data export completed or waived in writing

## Steps

1. **Billing** — Cancel Stripe subscription in Stripe Dashboard (or Customer Portal). Confirm webhook updates `tenant_subscriptions.status`.
2. **Suspend** — Platform admin suspends tenant (blocks login and writes).
3. **Export** — Tenant owner runs **Account → Data & privacy → Export all organization data**, or ops coordinates manual export. Waive in writing only if Customer explicitly declines portability (record `exportWaivedAt` via platform PATCH settings).
4. **Churn** — `PATCH /platform/tenants/:id` with `{ "status": "churned" }`.
5. **Audit** — Verify `platform.tenant.churned` appears in platform audit log.
6. **Hard delete (optional, after retention)** — After `TENANT_DELETE_MIN_DAYS_AFTER_CHURN` (default 30 days) from churn, platform admin uses **Delete permanently** in platform-admin or `DELETE /platform/tenants/:id`. Preconditions: export completed/waived, Stripe canceled, retention elapsed. Verify `platform.tenant.deleted` in audit log.

## Validation

- Owner cannot log in after suspend
- Churn rejected if tenant is not suspended or Stripe subscription still active
- Hard delete rejected if export not completed/waived or retention period not elapsed

## Related

- [superadmin-support.md](./superadmin-support.md)
- [tenant-migration.md](./tenant-migration.md)
- [compliance.md](../specs/compliance.md)
