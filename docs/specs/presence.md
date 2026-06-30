# Presence (team live) spec

## User-visible outcome

- **Admins** see which members currently have an active timer and elapsed time on the team live page.

## API

| Method | Route                | Roles | Contract                                                            |
| ------ | -------------------- | ----- | ------------------------------------------------------------------- |
| GET    | `/presence/snapshot` | ADMIN | [presence.dto.ts](../../packages/contracts/src/dto/presence.dto.ts) |
| GET    | `/presence/stream`   | ADMIN | presence.dto (SSE)                                                  |

Controller: [presence.controller.ts](../../apps/api/src/modules/presence/interface/http/presence.controller.ts)

## Behavior

- Reads active timer keys from Redis (or in-memory store when `REDIS_USE_MEMORY=true`).
- **Snapshot:** one-shot JSON list of active timers in the workspace.
- **Stream:** Server-Sent Events for live updates (admin UI subscribes).

## Given / When / Then

**Given** a member has started a timer  
**When** admin loads `/team` or calls `/presence/snapshot`  
**Then** that member appears with task/project context and elapsed seconds.

**When** member stops the timer  
**Then** they drop from presence after the next snapshot/stream event.

## UI

- [apps/admin/src/app/(admin)/team/page.tsx](<../../apps/admin/src/app/(admin)/team/page.tsx>)

## Edge cases

- No Redis in local dev: use `REDIS_USE_MEMORY=true` so timer and presence share the same store.
- Members cannot access presence endpoints (ADMIN only).
