# Project lead (PM) role — F17

## Persona

A **project lead** is a workspace `MEMBER` with `team_members.role = LEAD` on one or more projects. They act as a project manager for those projects only.

- LEAD is **not** a JWT claim; it is resolved from the database per request.
- `/auth/me` may include `ledProjectIds` as a UI hint for the admin app.
- The same user may lead multiple projects within a workspace.

## Permissions (led projects only)

| Action                                  | LEAD                | Workspace ADMIN    |
| --------------------------------------- | ------------------- | ------------------ |
| Tasks CRUD                              | Yes                 | Yes (all projects) |
| Project team list / invite / add member | Yes                 | Yes                |
| Assign LEAD role on team member         | No                  | Yes                |
| Timesheet approve / reject / amendments | Yes                 | Yes                |
| Reporting dashboard & summaries         | Scoped              | All projects       |
| Team live / presence                    | Scoped to led teams | All                |
| Projects / categories CRUD              | No                  | Yes                |
| Workspace team management               | No                  | Yes                |
| Billing, export wizard, API keys        | No                  | Yes                |
| Account / tenant billing                | No                  | Tenant OWNER/ADMIN |

## API enforcement

- Controllers that previously required `@Roles("ADMIN")` for matrix F17 rows now use `AdminOrProjectLeadGuard`.
- Services call `ProjectAccessService.assertCanManageProject(workspaceId, userId, workspaceRole, projectId)` for mutations.
- List endpoints filter by `manageableProjectIds` when the actor is not workspace ADMIN.

### Key routes

| Route                                 | LEAD access                          |
| ------------------------------------- | ------------------------------------ |
| `POST/PATCH/DELETE /tasks`            | Led project only                     |
| `GET/POST/PATCH /projects/:id/team/*` | Led project; `PATCH role` ADMIN only |
| `GET /timesheets/pending` etc.        | Filtered to led projects             |
| `PATCH /timesheets/:id/approve`       | Led project period only              |
| `GET /reporting/dashboard` etc.       | Scoped                               |
| `GET /presence/snapshot`              | Scoped                               |

## Admin app

Workspace MEMBERs with `ledProjectIds.length > 0` may sign in to the admin app.

### Nav (LEAD-only MEMBER)

| Item               | Visible                   |
| ------------------ | ------------------------- |
| Dashboard          | Yes                       |
| Projects           | Yes (led only in data)    |
| Approvals          | Yes                       |
| Time Tracker       | Yes                       |
| Team Live          | Yes                       |
| Notifications      | Yes                       |
| Exports            | No (use client export-me) |
| Team Management    | No                        |
| Categories         | No                        |
| Billing            | No                        |
| Workspace settings | No                        |

Bootstrap: `bootstrapSession({ requiredRole: "ADMIN", allowProjectLead: true })`.

## Assigning LEAD

Workspace **ADMIN** sets role via `PATCH /projects/:projectId/team/members/:memberId` with `{ role: "LEAD" | "MEMBER" }`.

LEAD cannot demote another LEAD.

## Dual app usage

Project leads may use both the client app (timer, personal logs) and the admin app (scoped PM tools).
