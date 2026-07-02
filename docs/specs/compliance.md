# Compliance — data export and tenant deletion (F23)

## User-visible outcome

- **Organization owner** can request a **full organization data export** (all workspaces) from Account.
- **Kloqra staff** can permanently delete a **churned** organization after export and retention preconditions.
- **Auth surfaces** link to Terms, Privacy, and refund policy.

## Legal documents

| Doc           | Path                                                |
| ------------- | --------------------------------------------------- |
| Terms         | [terms-of-service.md](../legal/terms-of-service.md) |
| Privacy       | [privacy-policy.md](../legal/privacy-policy.md)     |
| DPA           | [dpa-template.md](../legal/dpa-template.md)         |
| Subprocessors | [subprocessors.md](../legal/subprocessors.md)       |
| Refund        | [refund-policy.md](../legal/refund-policy.md)       |
| Sign-off      | [SIGNOFF.md](../legal/SIGNOFF.md)                   |

## Contracts

| Artifact     | Path                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------- |
| DTOs         | [compliance.dto.ts](../../packages/contracts/src/dto/compliance.dto.ts)                         |
| Routes       | `ROUTES.TENANTS.DATA_EXPORT`, `ROUTES.TENANTS.DATA_EXPORT_JOB`, `ROUTES.PLATFORM.TENANT_DELETE` |
| Audit action | `platform.tenant.deleted`                                                                       |

## API

| Method | Route                                         | Roles          |
| ------ | --------------------------------------------- | -------------- |
| POST   | `ROUTES.TENANTS.DATA_EXPORT`                  | Tenant owner   |
| GET    | `ROUTES.TENANTS.DATA_EXPORT_JOB(id)`          | Tenant owner   |
| GET    | `ROUTES.TENANTS.DATA_EXPORT_JOB(id)/download` | Tenant owner   |
| DELETE | `ROUTES.PLATFORM.TENANT_DELETE(id)`           | Platform admin |

### Tenant data export flow

1. Owner calls `POST /tenants/current/data-export` → job `queued`.
2. Worker exports each workspace (time entries JSON per workspace) into a ZIP with `manifest.json`.
3. Owner polls `GET .../data-export/:jobId` until `ready`, then downloads.
4. Jobs expire after 7 days (same retention as workspace export jobs).

**Allowed statuses:** `active`, `pending_setup`, `suspended`, `past_due` (GDPR read access). Blocked when `churned` if export was already completed.

### Hard delete preconditions

1. `tenants.status === churned`
2. Stripe subscription absent or `canceled`
3. Latest tenant export job `completed` OR `exportWaivedAt` set on tenant settings
4. `churnedAt` + `TENANT_DELETE_MIN_DAYS_AFTER_CHURN` (default 30) elapsed
5. Audit event `platform.tenant.deleted` recorded with tenant snapshot before cascade delete

## Environment

| Variable                             | Default | Purpose                                  |
| ------------------------------------ | ------- | ---------------------------------------- |
| `TENANT_DELETE_MIN_DAYS_AFTER_CHURN` | `30`    | Retention after churn before hard delete |
| `NEXT_PUBLIC_LEGAL_TOS_URL`          | —       | Footer / signup link                     |
| `NEXT_PUBLIC_LEGAL_PRIVACY_URL`      | —       | Footer / signup link                     |
| `NEXT_PUBLIC_LEGAL_REFUND_URL`       | —       | Billing page link                        |

## Given / When / Then

**When** tenant owner requests data export  
**Then** async job produces ZIP with all workspace exports and tenant metadata.

**When** platform admin deletes churned tenant without export  
**Then** `409 TENANT_DELETE_PRECONDITION_FAILED`.

**When** platform admin deletes churned tenant after preconditions  
**Then** tenant and cascaded data removed; audit event retained.

## Tests

- Unit: `tenant-data-export.service.spec.ts`, `platform-tenants.service.spec.ts`
- E2E: `tenant-data-export.e2e.ts`, `platform-tenants.e2e.ts` (delete paths)
- Playwright: `compliance-footer.spec.ts`

## Related runbooks

- [tenant-churn.md](../runbooks/tenant-churn.md)
