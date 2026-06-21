# Projects and team invites spec

## User-visible outcome

- **Admins** create and manage projects, view teams, generate invite links, and deactivate team members.
- **Members** see only projects where they are on the project team and can accept invites.

## API

| Method           | Route                         | Roles          | Contract                                                          |
| ---------------- | ----------------------------- | -------------- | ----------------------------------------------------------------- |
| GET              | `/projects`                   | Auth           | [project.dto.ts](../../packages/contracts/src/dto/project.dto.ts) |
| POST             | `/projects`                   | ADMIN          | project.dto                                                       |
| GET/PATCH/DELETE | `/projects/:id`               | ADMIN (mutate) | project.dto                                                       |
| GET              | `/projects/:id/team`          | ADMIN          | [team.dto.ts](../../packages/contracts/src/dto/team.dto.ts)       |
| POST             | `/projects/:id/team/invites`  | ADMIN          | team.dto                                                          |
| GET              | `/team-invites/:token`        | Public preview | team.dto                                                          |
| POST             | `/team-invites/:token/accept` | Auth           | team.dto                                                          |

Controllers: [projects.controller.ts](../../apps/api/src/modules/projects/interface/http/projects.controller.ts), [team-invites.controller.ts](../../apps/api/src/modules/projects/interface/http/team-invites.controller.ts)

## Domain rules

See [DOMAIN_MODEL.md](../architecture/DOMAIN_MODEL.md).

1. Creating a project auto-creates an empty **team**.
2. Only **team members** (or workspace admins) may log time on that project’s tasks.
3. Invite flow: admin creates link → member opens `/invite/[token]` on client → accepts → `TeamMember` row created.
4. **Project color:** admins set a workspace color from the curated palette or a custom hex (`projectColorSchema`). Members may override display color per project (`displayColor` on list responses).
5. **Common tasks:** tasks with `isCommon: true` are workspace-wide; any member can log time without being on the project team (see `project-access.service.ts`).
6. **Delete with logged time:** deleting a project moves its task logs to an **Uncategorized** fallback project/task so hours are preserved.

## Jira integration

- Workspace admins configure Jira Cloud credentials under **Admin → Workspace**.
- Members link Jira issues when creating time entries (optional).
- API: `GET /jira/my-issues`, `POST /jira/verify-user`. Admin: `/jira/credentials`, `/jira/verify`.

## Given / When / Then

### List projects

**When** MEMBER calls GET `/projects`  
**Then** only projects where they have an active `TeamMember` row are returned.

**When** ADMIN calls GET `/projects`  
**Then** all active projects in the workspace are returned.

### Create invite

**When** ADMIN POSTs `/projects/:id/team/invites`  
**Then** a tokenized invite is returned with expiry; optional email restriction if supported by DTO.

### Accept invite

**Given** a signed-in workspace member  
**When** they POST `/team-invites/:token/accept`  
**Then** they are added to the project team if the token is valid and not expired.

## UI

- Admin projects: [apps/admin/src/app/(admin)/projects/page.tsx](<../../apps/admin/src/app/(admin)/projects/page.tsx>)
- Client projects: [apps/client/src/app/(workspace)/projects/page.tsx](<../../apps/client/src/app/(workspace)/projects/page.tsx>)
- Invite accept: [apps/client/src/app/invite/[token]/page.tsx](../../apps/client/src/app/invite/[token]/page.tsx)

## Edge cases

- Project names unique per workspace.
- Deleting a project re-associates time logs to uncategorized fallback before cascade delete.
- Deleting a task with logged hours re-associates logs to an uncategorized task in the same project.
- Toggling timesheet approval settings waives open drafts — see [submissions.md](./submissions.md).
