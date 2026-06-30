# @kloqra/web-shared

Shared frontend code for **client** and **admin** Next.js apps: API client, auth/session, profile & settings, list hooks, and realtime workspace sync.

## API client

```tsx
import { api, publicFetch, fetchListItems, fetchPaginatedList } from "@kloqra/web-shared";
```

- `api(path, { workspaceId, method, body })` — authenticated JSON (auto refresh on 401)
- `publicFetch` — share links and public invite routes
- `fetchListItems` — unwrap `{ items }` or legacy array; use high `limit` for dropdowns
- `fetchPaginatedList` — full paginated response for tables

Query helpers: `buildListQuery`, `buildTableQuery`, `appendListQuery`.

## Hooks

| Hook                       | Purpose                                              |
| -------------------------- | ---------------------------------------------------- |
| `usePaginatedList`         | Server table: page, search, filters, loading, reload |
| `useClientTablePagination` | In-memory table pagination                           |
| `useWorkspaceStaleRefetch` | Refetch when realtime invalidates a scope            |
| `useNotificationSocket`    | Connect bell to Socket.IO `/notifications`           |
| `useUserProfile`           | Profile + preferences load/update                    |
| `useDisplayPreferences`    | Date/time format from user prefs                     |
| `useThemePreference`       | Theme sync to API                                    |

## Realtime

Workflow events (approve, assign, settings change) push over Socket.IO. Pages subscribe to invalidation scopes instead of polling:

```tsx
import { useNotificationSocket } from "@kloqra/web-shared";
import { invalidateWorkspaceData, WORKSPACE_DATA_STALE_EVENT } from "@kloqra/web-shared";
```

- Shell: mount `useNotificationSocket` once per authenticated app
- Stores: register refetch handlers in `apps/*/src/lib/workspace-data-sync.ts`
- Spec: [notifications-realtime.md](../../docs/specs/notifications-realtime.md)

## Stores

- `useSessionStore` — JWT session, workspace id, impersonation
- `useWorkspacesStore` — workspace list for switcher
- `useNotificationsStore` — bell unread count and inbox list

## Shared pages & components

| Export                   | Route(s)                  |
| ------------------------ | ------------------------- |
| `ProfilePage`            | `/profile`                |
| `AccountSettingsPage`    | `/settings`               |
| `WorkspaceSwitcher`      | Sidebar                   |
| `DashboardArrangeBanner` | Dashboard arrange mode    |
| `ReportScopeFilters`     | Admin exports             |
| `Providers`              | Theme + session providers |

Settings sections: appearance, time, notifications, security (password, 2FA, sessions), account preferences.

## Usage in apps

```tsx
// apps/client/src/lib/api.ts — thin re-export with AUTH_SCOPE
export { api } from "@kloqra/web-shared";
```

Apps pass `NEXT_PUBLIC_AUTH_SCOPE` (`client` | `admin`) so the API client sends `X-Auth-Scope`.

## Documentation

- [Frontend UI patterns](../../docs/development/FRONTEND-UI.md)
- [User profile spec](../../docs/specs/user-profile.md)
- [Realtime notifications spec](../../docs/specs/notifications-realtime.md)
