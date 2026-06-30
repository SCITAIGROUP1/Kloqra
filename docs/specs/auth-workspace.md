# Auth and workspace spec

## User-visible outcome

- Users **register** and **login** to receive a session (access token + refresh cookie).
- Users belong to one or more **workspaces** with role `ADMIN` or `MEMBER`.
- **Admins** can list workspace members and send workspace-level invites (where implemented).

## API

### Auth

| Method | Route                    | Contract                                                    |
| ------ | ------------------------ | ----------------------------------------------------------- |
| POST   | `/auth/register`         | [auth.dto.ts](../../packages/contracts/src/dto/auth.dto.ts) |
| POST   | `/auth/login`            | auth.dto                                                    |
| POST   | `/auth/refresh`          | —                                                           |
| POST   | `/auth/switch-workspace` | auth.dto                                                    |
| GET    | `/auth/me`               | —                                                           |
| DELETE | `/auth/logout`           | —                                                           |

Controller: [auth.controller.ts](../../apps/api/src/modules/auth/interface/http/auth.controller.ts)

### Workspace

| Method | Route                            | Contract                                                              |
| ------ | -------------------------------- | --------------------------------------------------------------------- |
| GET    | `/workspaces`                    | [workspace.dto.ts](../../packages/contracts/src/dto/workspace.dto.ts) |
| GET    | `/workspaces/:id/members`        | workspace.dto                                                         |
| POST   | `/workspaces/:id/members/invite` | workspace.dto                                                         |

Controller: [workspace.controller.ts](../../apps/api/src/modules/workspace/interface/http/workspace.controller.ts)

## Given / When / Then

### Register

**When** user POSTs `/auth/register` with email, password, name, workspace name  
**Then** user, workspace, and ADMIN membership are created; session tokens returned.

### Login

**When** valid credentials are posted  
**Then** session includes `workspaceId`, `workspaceRole`, and user profile fields.

### Me

**When** authenticated GET `/auth/me`  
**Then** current user and active workspace context are returned.

### User profile (extended)

See [user-profile.md](./user-profile.md) for `/users/me`, preferences, and password change.

## Security

See [AUTH.md](../architecture/AUTH.md) and [SECURITY.md](../development/SECURITY.md).

## UI

- Client: `/login`, `/register`
- Admin: `/login`
- Admin workspace: [apps/admin/src/app/(admin)/workspace/page.tsx](<../../apps/admin/src/app/(admin)/workspace/page.tsx>)

## Edge cases

- Refresh without valid cookie → unauthorized.
- `switch-workspace` requires membership in target workspace.
