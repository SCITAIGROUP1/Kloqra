# Tenant RBAC — roles, permissions, and UI map

> **Status:** Design SSOT (SaaS-F03)  
> **Parent:** [SAAS_PLATFORM_PLAN.md](./SAAS_PLATFORM_PLAN.md) §7 · **Domain:** [TENANT_DOMAIN_MODEL.md](./TENANT_DOMAIN_MODEL.md) · **Contracts:** `packages/contracts/src/tenant-rbac.ts`

---

## 1. Overview

Kloqra uses **four authorization layers**. Higher layers manage lower layers; **data isolation** is enforced at **workspace** and **tenant** boundaries.

| Layer                 | Role(s)                      | App                                       |
| --------------------- | ---------------------------- | ----------------------------------------- |
| Platform              | Superadmin                   | `platform-admin`                          |
| Tenant (Organization) | Owner                        | `admin` → **Account** mode (`/account/*`) |
| Workspace             | Admin, Member                | `admin` / `client`                        |
| Project               | Project Manager, Team member | `admin` (filtered) / `client`             |

**Workspace roles** (`ADMIN` \| `MEMBER`) and **team roles** (`PROJECT_MANAGER` \| `MEMBER`) are defined in `@kloqra/contracts` (`common.dto`, `tenant-rbac.ts`).

---

## 2. Role catalog

### Platform superadmin

|              |                                                                                     |
| ------------ | ----------------------------------------------------------------------------------- |
| **Persona**  | Kloqra operations / support                                                         |
| **App**      | `apps/platform-admin` (internal deploy)                                             |
| **Contract** | `platformRoleSchema` → `SUPERADMIN`                                                 |
| **Can**      | Tenant lifecycle, plan assignment, fleet ops, audit log, own account security       |
| **Cannot**   | Impersonate users (D13); access customer timesheet/workspace data; edit plan prices |

Full action catalog: [platform-admin.md](../specs/platform-admin.md). Plan config SSOT: [plans.md](../specs/plans.md).

### Tenant owner (`OWNER`)

|             |                                                                                      |
| ----------- | ------------------------------------------------------------------------------------ |
| **Persona** | Agency principal / org owner                                                         |
| **App**     | `admin` → Account home                                                               |
| **DB**      | `tenant_members.role = OWNER`                                                        |
| **Can**     | Create workspaces, assign workspace admins, subscription/billing (F13), org settings |
| **Cannot**  | Auto-access every workspace’s ops unless also `workspace_members` row                |

### Organization admin (`tenant_members.role = ADMIN`)

|             |                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------- |
| **Persona** | Operations delegate for the organization                                                     |
| **App**     | `admin` → Account mode (Workspaces, Workspace admins, Organization) + workspace mode         |
| **Can**     | Org profile (`PATCH /tenants/current`), create workspaces, assign/manage workspace admins    |
| **Cannot**  | Subscription/billing, data export, invite other organization admins, account overview rollup |

### Workspace admin (`workspace_members.role = ADMIN`)

|             |                                                                                    |
| ----------- | ---------------------------------------------------------------------------------- |
| **Persona** | Client or department manager                                                       |
| **App**     | `admin` → Workspace mode (today’s admin)                                           |
| **Can**     | Projects, categories, approvals, exports, billing rates, team live                 |
| **Scope**   | **One workspace** per membership; same person needs **separate row** per workspace |

### Project manager / PM (`team_members.role = PROJECT_MANAGER`)

|             |                                                                     |
| ----------- | ------------------------------------------------------------------- |
| **Persona** | Project manager                                                     |
| **App**     | `admin` with nav filtered to led projects                           |
| **Can**     | Tasks, team invites, approvals **for assigned projects only** (F17) |
| **Cannot**  | Workspace-wide billing, categories CRUD, create projects (v1)       |
| **Note**    | Same user may be `PROJECT_MANAGER` on **multiple projects** (D06)   |

### Member (`workspace_members.role = MEMBER`)

|             |                                                    |
| ----------- | -------------------------------------------------- |
| **Persona** | Staff logging time                                 |
| **App**     | `client`                                           |
| **Can**     | Timer, timesheet, assigned projects, member export |
| **Cannot**  | Admin aggregates, other members’ revenue           |

---

## 3. Role hierarchy

```mermaid
flowchart TB
  subgraph platform [Platform]
    Superadmin[PlatformSuperadmin]
  end
  subgraph tenant [Tenant]
    Owner[TenantOwner]
    TenantAdmin[TenantAdmin_optional]
  end
  subgraph ws [Workspace]
    WsAdmin[WorkspaceAdmin]
    Member[Member]
  end
  subgraph project [Project]
    PM[ProjectManager]
    TeamMember[TeamMember]
  end
  Superadmin --> Owner
  Owner --> TenantAdmin
  Owner --> WsAdmin
  WsAdmin --> PM
  WsAdmin --> Member
  PM --> TeamMember
```

---

## 4. App routing

```mermaid
flowchart LR
  subgraph apps [Apps]
    PA[platform-admin]
    AD[admin]
    CL[client]
  end
  Superadmin --> PA
  Owner --> AD
  WsAdmin --> AD
  PM --> AD
  Member --> CL
  AD --> Account[Account mode]
  AD --> Workspace[Workspace mode]
```

| App              | `NEXT_PUBLIC_AUTH_SCOPE` | Primary roles              |
| ---------------- | ------------------------ | -------------------------- |
| `platform-admin` | `platform` (new)         | Superadmin                 |
| `admin`          | `admin`                  | Owner, workspace admin, PM |
| `client`         | `client`                 | Member                     |

**Admin shell:** Tenant owner lands on **Account** (`/account`); workspace operators land on **Workspace** (`/dashboard`, etc.). Use existing `LayoutShell` from `@kloqra/ui`.

**Context orientation (admin):**

- **Breadcrumb** — sticky strip above page content: `Organization › Workspace › Role` (owners in workspace mode) or `Organization › Organization` (account mode). Non-owners see `Workspace › Role` only.
- **Context switcher** — sidebar control lists Organization (owners) and all admin-accessible workspaces with role labels (`Owner · Admin`, `Project manager`, etc.).
- **Post-login picker** — when a user has **3+ contexts** (organization + 2+ workspaces, or 3+ workspaces), login redirects to `/select-context` (“Choose how you want to work”) instead of workspace-only selection.

---

## 5. Data visibility

```mermaid
flowchart TB
  subgraph tenantBoundary [Tenant boundary]
    WS1[Workspace A]
    WS2[Workspace B]
  end
  OtherTenant[Other tenant — invisible]
  WS1 --> P1[Project]
  P1 --> Team[Team members only]
  tenantBoundary -.->|no cross-tenant| OtherTenant
```

| Viewer          | Sees                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| Superadmin      | Tenant list, status, plan — not member time by default                                                     |
| Tenant owner    | All **tenant** workspaces list; **rollup metrics** on Account overview (F18); workspace ops only if member |
| Workspace admin | All projects in **that workspace**                                                                         |
| PM              | Assigned **projects** only                                                                                 |
| Member          | Team projects only; own time                                                                               |

---

## 6. Provisioning flows

### Superadmin → tenant owner (D16)

```mermaid
sequenceDiagram
  participant Ops as Superadmin
  participant API
  participant Owner as TenantOwner

  Ops->>API: POST PLATFORM.TENANTS
  API->>Owner: Email temp credentials
  Owner->>API: Login + complete org profile
  API-->>Owner: tenant status active
```

### Owner → workspace → workspace admin (D05, D14)

```mermaid
sequenceDiagram
  participant Owner as TenantOwner
  participant API
  participant Admin as WorkspaceAdmin

  Owner->>API: POST TENANTS.WORKSPACES
  Owner->>API: Invite ADMIN to workspace
  API->>Admin: Email / credentials
  Note over Admin: Separate invite for each workspace
```

### Multi-workspace member (D15)

One `users` row → one `tenant_members` row → multiple `workspace_members` rows (same `tenant_id` via workspace FK).

---

## 7. Permission matrix (by domain)

Legend: **Y** yes · **N** no · **S** scoped · **A** account-only · **—** not applicable

| Domain                    | Superadmin | Tenant owner | Workspace admin | Project manager | Member |
| ------------------------- | ---------- | ------------ | --------------- | --------------- | ------ |
| Platform tenant CRUD      | Y          | N            | N               | N               | N      |
| Account / subscription    | —          | A            | N               | N               | N      |
| Create workspace          | —          | Y            | N               | N               | N      |
| Assign workspace admin    | —          | Y            | N               | N               | N      |
| Switch workspace (tenant) | —          | S            | S               | S               | S      |
| Projects CRUD             | —          | S            | Y               | N               | N      |
| Categories CRUD           | —          | S            | Y               | N               | N      |
| Tasks CRUD                | —          | S            | Y               | S               | N      |
| Team invites              | —          | S            | Y               | S               | N      |
| Timer / own logs          | —          | S            | Y               | Y               | Y      |
| Timesheet submit          | —          | S            | Y               | Y               | Y      |
| Timesheet approve         | —          | S            | Y               | S               | N      |
| Reporting dashboard       | —          | S            | Y               | S               | S      |
| Billing rates (client)    | —          | S            | Y               | N               | N      |
| Export wizard             | —          | S            | Y               | N               | N      |
| Export me                 | —          | S            | Y               | Y               | Y      |
| Team live / presence      | —          | S            | Y               | S               | N      |
| Public API keys           | —          | S            | Y               | N               | N      |

**S** for tenant owner = only when they have a `workspace_members` row for that workspace.

---

## 8. Subscription overlay (all roles)

When `tenant_subscriptions.status` is `past_due` or `suspended` (D12):

```mermaid
flowchart LR
  Request[Mutation request] --> SubCheck{Subscription active?}
  SubCheck -->|yes| RoleCheck[Normal RBAC]
  SubCheck -->|no| Block[403 PLAN_OR_PAYMENT_BLOCKED]
  RoleCheck --> Allow[Allow if role permits]
```

**Blocked mutations (v1):** `POST` timer start, manual timelog create, bulk import. Read access TBD in F12.

---

## 9. Request authorization flow

```mermaid
flowchart TD
  Req[HTTP request] --> JwtGuard[JwtAuthGuard]
  JwtGuard --> PlatformRoute{Platform route?}
  PlatformRoute -->|yes| PlatformGuard[PlatformGuard]
  PlatformRoute -->|no| TenantMember[Tenant membership]
  TenantMember --> WsSwitch{Workspace context}
  WsSwitch --> TenantMatch{workspace.tenantId matches user}
  TenantMatch -->|no| Deny403[403]
  TenantMatch -->|yes| SubGuard[SubscriptionWriteGuard]
  SubGuard --> RolesGuard[RolesGuard workspace role]
  RolesGuard --> ProjectCheck{Project-scoped action?}
  ProjectCheck -->|yes| PMCheck[PROJECT_MANAGER or ADMIN]
  ProjectCheck -->|no| Handler[Controller]
```

Implement in SaaS-F04, F05, F10, F17. Until then, existing `workspaceId` guards remain.

---

## 10. Combined personas

| Person      | Memberships                                  | Apps                             |
| ----------- | -------------------------------------------- | -------------------------------- |
| **Alex**    | `OWNER` only                                 | Account                          |
| **Sarah**   | `ADMIN` in Workspace Fabrikam + Contoso      | Admin, workspace switcher        |
| **Mike**    | `MEMBER` + `PROJECT_MANAGER` on Project X, Y | Admin filtered + client for time |
| **Jane**    | `MEMBER` in two workspaces                   | Client, switcher                 |
| **Sarah+M** | `ADMIN` + `PROJECT_MANAGER` on one project   | Admin full in WS + PM on project |

---

## 11. Deny rules (never)

1. Cross-tenant data access (user has only one `tenant_members` row).
2. Cross-workspace access without `workspace_members` row.
3. Auto-provision workspace admin to all workspaces on one invite.
4. Superadmin impersonation (D13).
5. Member sees org-wide revenue or peer rankings (existing principle).
6. Accept `workspaceId` / `tenantId` from body for authorization — use JWT + guards only.

---

## 12. Frontend — Account UI component map (SaaS-F08)

Follow [FRONTEND-UI.md](../development/FRONTEND-UI.md) and [chronomint-fe-feature skill](../../.cursor/skills/chronomint-fe-feature/SKILL.md). **No new primitives in apps** — use `@kloqra/ui` and `@kloqra/web-shared`.

### Layout

```
apps/admin/src/app/(admin)/account/
  page.tsx              → thin server wrapper
  layout.tsx            → Account sub-nav (optional)

apps/admin/src/features/account/
  account-overview-page.tsx
  account-workspaces-page.tsx
  account-organization-page.tsx
  account-billing-page.tsx      (stub until F13)
  components/
    workspace-admin-assign-dialog.tsx
    create-workspace-dialog.tsx
```

### Component rules

| UI need                 | Use                                                |
| ----------------------- | -------------------------------------------------- |
| Tables (workspace list) | `DataTableCard`, `usePaginatedList` or static list |
| Create workspace        | `AppModal` + form                                  |
| Assign admin            | `AppModal` + `fetchListItems` / invite API         |
| Loading                 | `TableLoadingState`, `CenteredLoader`              |
| Success/error           | `toast` from `sonner`                              |
| API calls               | `api()` + `ROUTES.TENANTS.*` from contracts        |
| Types                   | `TenantOverviewDto`, etc. from `@kloqra/contracts` |

### platform-admin (SaaS-F14)

```
apps/platform-admin/src/app/
  (platform)/tenants/page.tsx
apps/platform-admin/src/features/tenants/
  tenant-list-page.tsx
  tenant-create-page.tsx
```

Same table/modal patterns; **separate** `NEXT_PUBLIC_AUTH_SCOPE=platform`.

---

## 13. Production-grade validation

Canonical checklist: [SAAS_PLATFORM_PLAN.md §7.2](./SAAS_PLATFORM_PLAN.md). RBAC-specific gates:

- [ ] `TENANT_RBAC.md` signed off (this doc)
- [ ] Contracts enums match matrix (`tenant-rbac.spec.ts` green)
- [x] F05 isolation E2E before F06+
- [x] F17 matrix rows implemented in code (`docs/specs/project-manager.md`)
- [ ] No `@Roles("ADMIN")` bypass for PROJECT_MANAGER without service check

---

## 14. Current vs target

| Today                             | Target                                  |
| --------------------------------- | --------------------------------------- |
| `ADMIN` \| `MEMBER` per workspace | + tenant + platform + `PROJECT_MANAGER` |
| Any user `POST /workspaces`       | Tenant owner only                       |
| No tenant entity                  | `tenants` + `tenant_members`            |
| Single app pair                   | + `platform-admin`                      |

---

## 15. Implementation map

| Epic    | RBAC deliverable              |
| ------- | ----------------------------- |
| F03     | This document + contracts     |
| F04     | JWT `tenantId`, guards        |
| F05     | Isolation E2E                 |
| F06–F07 | Tenant + workspace APIs       |
| F08     | Account UI (§12)              |
| F10     | Plan limits guard             |
| F12     | Subscription write guard      |
| F14–F15 | Platform routes               |
| F17     | `PROJECT_MANAGER` enforcement |
