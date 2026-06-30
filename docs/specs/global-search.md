# Global search spec

## User-visible outcome

- **Admins** open global search from anywhere in the admin app via **⌘K** (Mac) / **Ctrl+K** (Windows/Linux) or a header search affordance.
- Results are grouped: **Pages**, **Projects**, **Tasks**, **Categories**, **People**.
- Selecting a result navigates to the correct admin destination and closes the palette.
- With an empty query, **Pages** lists all sidebar destinations (quick jump).
- Typing **≥2 characters** triggers entity search (debounced 300ms, matching [`use-paginated-list.ts`](../../packages/web-shared/src/hooks/use-paginated-list.ts)).

## Scope and exclusions

- Admin app only (`apps/admin`); no client/member surface.
- Scoped to the active workspace from session; no cross-workspace search.
- No free-text search on approvals, notifications, billing, or exports in v1.
- Clients are not a separate entity; project `clientName` matches via project search.

## API

v1 reuses existing list endpoints — **no new route**.

| Method | Route                                              | Roles | Purpose       |
| ------ | -------------------------------------------------- | ----- | ------------- |
| GET    | `/projects?search=&limit=5`                        | ADMIN | Project hits  |
| GET    | `/tasks?search=&limit=5`                           | ADMIN | Task hits     |
| GET    | `/categories?search=&limit=5`                      | ADMIN | Category hits |
| GET    | `/workspaces/:id/members/overview?search=&limit=5` | ADMIN | People hits   |

Shared pagination: [`pagination.ts`](../../packages/contracts/src/pagination.ts) — optional `search` (1–200 chars).

DTOs: [`project.dto.ts`](../../packages/contracts/src/dto/project.dto.ts), [`task.dto.ts`](../../packages/contracts/src/dto/task.dto.ts), [`category.dto.ts`](../../packages/contracts/src/dto/category.dto.ts), [`workspace.dto.ts`](../../packages/contracts/src/dto/workspace.dto.ts).

## Navigation targets

| Result type | Destination                         |
| ----------- | ----------------------------------- |
| Page        | Static route from admin sidebar nav |
| Project     | `/projects/:id/overview`            |
| Task        | `/projects/:projectId/tasks`        |
| Category    | `/categories`                       |
| Person      | `/team-management`                  |

When a group returns more than five hits, a **View all** row links to the list page with `?search=` when applicable.

## Behavior

- Minimum query length: **2** characters before API fan-out (shorter queries filter **Pages** locally only).
- Debounce: **300ms**; stale responses are discarded when the query changes.
- Parallel fan-out to all four entity endpoints; partial results render if one call fails.
- Cap: **5 hits per entity group**.
- RBAC: palette renders only for workspace `ADMIN` (enforced by admin shell).
- Keyboard: ↑↓ navigate, Enter select, Esc close; focus trapped in dialog.

## Given / When / Then

**When** an admin presses ⌘K on any admin page  
**Then** the palette opens and the **Pages** group lists all sidebar destinations.

**When** an admin types `acme` (≥2 characters)  
**Then** Projects, Tasks, Categories, and People groups populate from the API.

**When** an admin selects a project result  
**Then** the app navigates to `/projects/:id/overview` and the palette closes.

**When** an admin selects the Approvals page  
**Then** the app navigates to `/approvals`.

**When** entity search returns no matches  
**Then** entity groups show no results; **Pages** still filter locally.

**When** one API call fails  
**Then** other groups still render; the failed group is omitted.

**When** the workspace is switched while the palette is open  
**Then** the palette closes and results clear.

## UI

- Entry: search trigger in admin shell toolbar (search icon + “Search…” hint with ⌘K badge).
- Feature: [`apps/admin/src/features/global-search/`](../../apps/admin/src/features/global-search/)
- Nav config: [`apps/admin/src/config/admin-nav.ts`](../../apps/admin/src/config/admin-nav.ts)

## Edge cases

- Slow network / race: ignore responses when `query` no longer matches the in-flight request.
- Special characters: URL-encoded via [`buildListQuery`](../../packages/web-shared/src/api/list-query.ts).
- Tasks always include `projectId` in list DTOs; omit hits only if `projectId` is missing.
- Members with zero project assignments still appear in People search.

## Follow-ups (not v1)

- Unified `GET /search` for ranking and a single round-trip.
- Timesheet/approval text search.
- Wire ignored `search` on notifications and billing list endpoints.
- Recent searches (localStorage).
- Client app parity (out of scope).
