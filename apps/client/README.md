# Kloqra Client

Next.js 15 member app — timer, timesheet, time tracker, dashboard, tasks, and personal exports.

## Commands

```bash
# From repo root
pnpm --filter @kloqra/client dev
pnpm --filter @kloqra/client test:e2e
```

## Environment

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_AUTH_SCOPE=client
NEXT_PUBLIC_HARD_AUTO_STOP_HOURS=12
```

## Routes

| Path                      | Purpose                                      |
| ------------------------- | -------------------------------------------- |
| `/login`, `/set-password` | Authentication                               |
| `/timer`                  | Start/stop timer; daily goal widget          |
| `/timesheet`              | Calendar week/day/month view; manual entries |
| `/time-tracker`           | Week-grouped log list with edit/delete       |
| `/dashboard`              | Member dashboard widgets                     |
| `/submissions`            | Submit timesheets for project approval       |
| `/tasks`                  | Task list (paginated, filter by project)     |
| `/projects`               | Assigned projects                            |
| `/profile`                | User profile                                 |
| `/settings`               | Account preferences and security             |
| `/invite/[token]`         | Accept project team invite                   |

Default URL: http://localhost:3000

## UI patterns

Shared profile/settings from `@kloqra/web-shared`. Toasts via Sonner. See [docs/development/FRONTEND-UI.md](../../docs/development/FRONTEND-UI.md).

## Deploy (Vercel)

1. Create a Vercel project with **Root Directory** `apps/client`.
2. Enable **Include source files outside of the Root Directory**.
3. Set `NEXT_PUBLIC_API_BASE_URL` to your deployed API URL.

Full guide: [docs/runbooks/vercel.md](../../docs/runbooks/vercel.md).

## Documentation

- [Member user guides](../../docs/user-guides/member/)
- [Feature specs](../../docs/specs/)
