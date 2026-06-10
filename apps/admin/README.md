# Kloqra Admin

Next.js 15 workspace admin app — projects, dashboard, team management, billing, exports, approvals.

## Commands

```bash
# From repo root
pnpm --filter @kloqra/admin dev
pnpm --filter @kloqra/admin test:e2e
```

## Environment

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_AUTH_SCOPE=admin
```

## Routes

| Path                     | Purpose                                        |
| ------------------------ | ---------------------------------------------- |
| `/login`                 | Admin sign-in (`ADMIN` workspace role)         |
| `/dashboard`             | Configurable analytics widgets; arrange layout |
| `/team-management`       | Workspace members, roles, invites              |
| `/approvals`             | Pending timesheet approvals                    |
| `/projects`              | Project list; create via modal                 |
| `/projects/:id/tasks`    | Project tasks                                  |
| `/projects/:id/team`     | Project team and invite links                  |
| `/projects/:id/settings` | Project settings and approval config           |
| `/categories`            | Task categories                                |
| `/team`                  | Team Live — real-time activity                 |
| `/billing`               | Hourly rates (paginated table)                 |
| `/exports`               | Multi-report export wizard + invoice PDF       |
| `/workspace`             | Workspace settings; create workspace           |
| `/profile`               | User profile (shared `@kloqra/web-shared`)     |
| `/settings`              | Account settings (appearance, security, …)     |
| `/share/[token]`         | Public export share view                       |

Default URL: http://localhost:3002

## UI patterns

Tables use `DataTableCard` + `usePaginatedList`. Modals use `AppModal`. Toasts via Sonner. See [docs/development/FRONTEND-UI.md](../../docs/development/FRONTEND-UI.md).

## Deploy (Vercel)

Separate Vercel project from the client app; **Root Directory** `apps/admin`, same API env var.

See [docs/runbooks/vercel.md](../../docs/runbooks/vercel.md).

## Documentation

- [Admin user guides](../../docs/user-guides/admin/)
- [Export spec](../../docs/specs/export.md)
- [Reporting spec](../../docs/specs/reporting.md)
