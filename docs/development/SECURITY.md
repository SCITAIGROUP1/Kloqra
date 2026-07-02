# Security

## Secrets

- Never commit `.env`, `.env.local`, or credentials to git.
- Use `apps/api/.env.example` and frontend `.env.example` as templates only.
- Production: generate cryptographically random `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (minimum 32 characters).

## Authentication

| Mechanism         | Purpose                                                           |
| ----------------- | ----------------------------------------------------------------- |
| JWT access token  | Short-lived API authorization (`JWT_ACCESS_EXPIRES`, default 15m) |
| JWT refresh token | httpOnly cookie; renews access via `POST /auth/refresh`           |
| Password storage  | bcrypt hash in `users.password_hash`                              |

Access token can be sent as:

- `Authorization: Bearer <token>`, or
- `access_token` httpOnly cookie (used by cookie-based flows)

## Workspace isolation

Every mutating and listing operation is scoped by `workspaceId` from the JWT/header. Services join through `task → project → workspace` or direct `workspaceId` on entities.

Do not accept `workspaceId` from request body for authorization — use `req.user.workspaceId` from the guard.

## Tenant isolation

The **organization** (`tenants` table) is the commercial and security boundary; **workspaces** are operational partitions within a single tenant.

| Control            | Behavior                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| JWT claims         | Access tokens carry `tenantId` and `workspaceId`                                                                                              |
| `JwtAuthGuard`     | After resolving workspace (token + optional `X-Workspace-Id`), verifies `workspace.tenant_id === jwt.tenantId` via `assertJwtWorkspaceTenant` |
| `switch-workspace` | Rejects workspaces outside the user’s tenant (D08: one tenant per user)                                                                       |
| Workspace list     | `listForUser` filters workspaces by the user’s tenant                                                                                         |
| IDOR               | Services scope by `req.user.workspaceId`; never authorize from body `tenantId` or `workspaceId`                                               |

**Redis / Socket.IO (v1):** Channels remain workspace-scoped; tenant boundary is enforced at auth and via the workspace `tenant_id` foreign key. No separate Redis tenant prefix is required for P1.

**Public API keys:** Workspace-scoped reporting credentials (`reporting_api_credentials`). Management routes assert `workspace.tenant_id === jwt.tenantId` (defense-in-depth beyond `JwtAuthGuard`). `validate()` blocks suspended/churned organizations. Platform suspend deletes all tenant reporting API keys. Plan cap: `maxReportingApiKeys` per organization (F19).

Pen-test checklist — cross-tenant workspace switch, UUID guess on projects/categories, per-workspace admin without membership — is covered by `apps/api/test/tenant-isolation.e2e.ts`.

See [TENANT_RBAC.md §11](../architecture/TENANT_RBAC.md) for role boundaries.

## CORS and cookies

`FRONTEND_ORIGIN` must list exact frontend origins. The API enables credentials for cookie-based refresh.

**Vercel + Railway (cross-site):** set `AUTH_COOKIE_SAME_SITE=none` and `AUTH_COOKIE_SECURE=true` on the API. Without this, browsers do not send refresh cookies on cross-origin `fetch`.

Refresh tokens are rotated in Postgres. A short **grace window** (`REFRESH_ROTATION_GRACE_MS`, default 10s) tolerates concurrent tab refresh; reuse after the grace window revokes the token family.

**CSRF (SameSite=None):** `login`, `register`, `refresh`, and `logout` require an `Origin` header on allowed frontend domains in production. Browsers always send `Origin` on cross-site `fetch`; simple form POSTs cannot forge auth requests.

**Startup gates:** Production API refuses to start without `FRONTEND_ORIGIN`, with wrong cookie SameSite for cross-site Vercel+Railway, or with `COOKIE_DOMAIN` set in that topology.

## RBAC

Workspace roles (`ADMIN`, `MEMBER`) gate admin-only controllers. Additional checks in services prevent members from editing others’ time logs or accessing admin-only aggregates.

## Rate limiting

Not implemented in v1. Add at the reverse proxy or API gateway for production if needed.

## Export downloads

Export endpoints return binary streams with `Content-Disposition` attachment filenames. Filenames are sanitized in `packages/contracts/src/export-filename.ts` to prevent path injection.

## Reporting sensitive data

- Members do not receive workspace-wide revenue or other members’ hours in the client app by design.
- Admin exports can include email, rates, and amounts — restrict admin accounts accordingly.

## Incident response

1. Rotate `JWT_*_SECRET` (invalidates all sessions).
2. Review `FRONTEND_ORIGIN` for unexpected domains.
3. Audit workspace `ADMIN` memberships via `GET /workspaces/:id/members`.

See [AUTH.md](../architecture/AUTH.md) and [ENVIRONMENT.md](ENVIRONMENT.md).
