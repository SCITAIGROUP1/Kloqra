# Tenants and organization accounts

## User-visible outcome

- **Kloqra staff** provision an **Organization** (tenant) and temporary owner account.
- **Organization owner** creates **workspaces**, assigns **workspace admins** per workspace, and manages subscription (when billing ships).
- **Workspace admins** and **members** continue to work as today within each workspace.
- **Project managers (PM)** manage assigned projects only (F17).

## Architecture docs

| Doc                                                              | Content                           |
| ---------------------------------------------------------------- | --------------------------------- |
| [TENANT_DOMAIN_MODEL.md](../architecture/TENANT_DOMAIN_MODEL.md) | Entities, migration, provisioning |
| [TENANT_RBAC.md](../architecture/TENANT_RBAC.md)                 | Roles, matrices, diagrams, UI map |
| [SAAS_PLATFORM_PLAN.md](../architecture/SAAS_PLATFORM_PLAN.md)   | Full epic plan                    |

## Contracts

| Artifact   | Path                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------ |
| Role enums | [tenant-rbac.ts](../../packages/contracts/src/tenant-rbac.ts)                              |
| DTOs       | [tenant.dto.ts](../../packages/contracts/src/dto/tenant.dto.ts)                            |
| Routes     | `ROUTES.TENANTS`, `ROUTES.PLATFORM` in [routes.ts](../../packages/contracts/src/routes.ts) |

## API (SaaS-F06, F07)

| Method                   | Route                                      | Roles                                                                                   |
| ------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------- |
| GET                      | `ROUTES.TENANTS.CURRENT`                   | Tenant member (`tenant_members` row required)                                           |
| PATCH                    | `ROUTES.TENANTS.CURRENT`                   | Tenant owner, organization admin (complete `pending_setup` org profile → `active`)      |
| GET                      | `ROUTES.TENANTS.OVERVIEW`                  | Tenant owner                                                                            |
| GET                      | `ROUTES.TENANTS.ANALYTICS_SUMMARY`         | Tenant owner (cross-workspace rollup; see [tenant-analytics.md](./tenant-analytics.md)) |
| GET                      | `ROUTES.TENANTS.MEMBERS`                   | Tenant owner, organization admin                                                        |
| POST                     | `ROUTES.TENANTS.MEMBERS`                   | Tenant owner (invite organization `ADMIN`)                                              |
| PATCH                    | `ROUTES.TENANTS.MEMBER(id)`                | Tenant owner                                                                            |
| POST                     | `ROUTES.TENANTS.WORKSPACES`                | Tenant owner, organization admin (create workspace)                                     |
| GET                      | `ROUTES.TENANTS.WORKSPACE_ADMINS_OVERVIEW` | Tenant owner, organization admin                                                        |
| PATCH/DELETE/POST resend | `ROUTES.TENANTS.WORKSPACE_MEMBER`          | Tenant owner, organization admin (manage workspace admins without workspace JWT)        |
| POST                     | `ROUTES.WORKSPACES.ASSIGN_ADMIN(id)`       | Tenant owner, organization admin (assign workspace admin)                               |
| GET                      | `ROUTES.TENANTS.SUBSCRIPTION`              | Tenant owner                                                                            |

## Given / When / Then

**When** superadmin creates a tenant with owner email  
**Then** owner can log in (admin app), set password, `PATCH /tenants/current` to complete organization profile, and tenant becomes `active`.

**When** tenant is `suspended` or `churned`  
**Then** login and write operations (timer, timelogs) are blocked.

**Deferred (F23):** GDPR export automation and superadmin hard delete — see [compliance.md](./compliance.md). Platform mutations shipped in **F15**.

**When** tenant owner creates a workspace and invites an admin  
**Then** admin can access **only** that workspace until invited elsewhere.

**When** tenant owner invites a tenant admin  
**Then** invitee receives credentials (or workspace-added email) and appears in `GET /tenants/current/members`.

**When** subscription is `past_due`  
**Then** timer start and manual timelog create return payment-blocked error (D12).

**Seat count (overview):** distinct active users in `tenant_members` ∪ `workspace_members` for the tenant’s workspaces. **Enforced (F10):** tenant admin invite checks seat cap before user create.

**Subscription in overview:** loaded from `tenant_subscriptions` + `plans` (F09). See [plans.md](./plans.md).

## Tests

- Unit: `apps/api/src/modules/tenants/application/tenants.service.spec.ts`, `workspace.service.spec.ts`
- E2E: `apps/api/test/tenants.e2e.ts`, `platform-tenants-provision.e2e.ts`, `platform-tenants-suspend.e2e.ts`, `tenant-analytics.e2e.ts`

## UI

- Account: `apps/admin/src/features/account/` (F08, F15 owner setup on `/account/organization`)
- Platform: `apps/platform-admin/` (F14–F15 create/list/detail/suspend)

## Edge cases

- One user cannot belong to two tenants (D08). Enforced on tenant-admin invite, workspace invite, bulk invite, assign-workspace-admin, signup, and platform provision.
- Workspace-only users cannot call tenant account routes.
- Cannot deactivate or demote the last active tenant owner.
- Workspace admin in two workspaces requires two invites (D14).
- PM on multiple projects: union of led projects for admin nav (D06).
