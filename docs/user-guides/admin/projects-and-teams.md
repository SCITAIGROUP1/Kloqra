# Admin: Projects and teams

## Categories

Tasks belong to a **category**. Create categories before adding tasks.

1. Go to **Categories** (`/categories`).
2. Enter name and optional description → **Add category**.
3. Edit or delete categories inline in the table.

## Create a project

1. Go to **Projects** (`/projects`).
2. Click **New project**.
3. Enter name, optional client, and color → **Create project**.

## Project detail

Open a project to manage:

| Tab          | Purpose                                              |
| ------------ | ---------------------------------------------------- |
| **Tasks**    | Create, edit, delete tasks (grouped by category)     |
| **Team**     | Project team members, invite links                   |
| **Settings** | Name, client, color, active flag, timesheet approval |

## Invite members to a project

1. Open the project → **Team** tab.
2. Optionally enter an email → **Generate invite link**.
3. Copy the link and send it to the member.
4. The member opens the link in the **client app**, signs in, and accepts.

Members must belong to the workspace (invite via **Team management** first if needed).

## Workspace team management

1. Go to **Team management** (`/team-management`).
2. Click **Add team member** — invite by email with Member or Admin role.
3. View profile, change role, or remove members from the table actions.

## Timesheet approval

On **Project → Settings**, enable timesheet approval and choose daily, weekly, or monthly period (or use the workspace default). Members submit from the client **Submissions** page; admins review on **Approvals** (`/approvals`).

For the full workflow — statuses, locks, missing reminders, edit requests, and what happens when you change settings — see **[Timesheet submissions and approval](../timesheet-submissions-and-approval.md)**.

## What members see

Members only see projects where they are on the team. They log time against **tasks** under those projects.

## Related

- [DOMAIN_MODEL.md](../../architecture/DOMAIN_MODEL.md)
- [projects.md](../../specs/projects.md)
- [user-profile.md](../../specs/user-profile.md)
