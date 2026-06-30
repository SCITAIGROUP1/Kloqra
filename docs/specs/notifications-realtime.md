# Realtime notifications spec

## User-visible outcome

- When an admin approves a timesheet, rejects a submission, or changes approval settings, **members see the bell update immediately** and **open pages refetch** without a manual refresh.
- Admins see pending approvals refresh when members submit timesheets or request amendments.
- If the WebSocket drops, **60s polling** (5 min when connected) and **tab focus refetch** keep data reasonably fresh.

## Architecture

```
createInApp → Redis PUBLISH notifications:user:{userId}
           → NotificationsGateway (Socket.IO /notifications)
           → notification.created event
           → notification-socket-manager (browser)
           → bell store + invalidateWorkspaceData(scopes)
           → page stores refetch via WORKSPACE_DATA_STALE_EVENT
```

## Contracts

| Artifact                   | Location                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Socket namespace           | `NOTIFICATIONS_SOCKET_NAMESPACE` in [routes.ts](../../packages/contracts/src/routes.ts)                                  |
| Push payload               | [notification-realtime.ts](../../packages/contracts/src/notification-realtime.ts)                                        |
| Invalidate scopes          | `submissions`, `timesheet`, `projects`, `tasks`, `pending_approvals`                                                     |
| Approval settings template | `project.approvalSettingsChanged` in [notification-templates.ts](../../packages/contracts/src/notification-templates.ts) |

## API

| Transport | Path             | Auth                                             |
| --------- | ---------------- | ------------------------------------------------ |
| Socket.IO | `/notifications` | JWT in `handshake.auth.token` + optional `scope` |

Gateway: [notifications.gateway.ts](../../apps/api/src/modules/notifications/interface/ws/notifications.gateway.ts)

Publisher: [notifications-realtime.service.ts](../../apps/api/src/modules/notifications/application/notifications-realtime.service.ts)

## Frontend

| Piece                   | Location                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| Shared socket singleton | [notification-socket-manager.ts](../../packages/web-shared/src/realtime/notification-socket-manager.ts) |
| Shell hook              | [use-notification-socket.ts](../../packages/web-shared/src/hooks/use-notification-socket.ts)            |
| Data invalidation bus   | [workspace-data-sync.ts](../../packages/web-shared/src/realtime/workspace-data-sync.ts)                 |
| Client store wiring     | [apps/client/src/lib/workspace-data-sync.ts](../../apps/client/src/lib/workspace-data-sync.ts)          |
| Admin store wiring      | [apps/admin/src/lib/workspace-data-sync.ts](../../apps/admin/src/lib/workspace-data-sync.ts)            |

## Given / When / Then

**Given** a member has submissions open  
**When** an admin approves their timesheet  
**Then** the member's bell unread count updates via WebSocket and submissions refetch.

**Given** a member has the tasks page or timer open  
**When** an admin assigns or unassigns them to a task or project  
**Then** task pickers and paginated task lists refetch via the `tasks` scope.

**Given** an admin toggles project approval settings  
**When** the change is saved  
**Then** each project member receives `project.approvalSettingsChanged` and submissions/projects caches invalidate.

**Given** the user logs out  
**When** `logoutSession` runs  
**Then** the notification socket disconnects immediately.

**Given** the access token is refreshed in another tab  
**When** `subscribeSessionUpdates` fires  
**Then** the socket reconnects with the new token.

## Production notes

- Railway / reverse proxy must allow **WebSocket upgrade** on the API host (`wss://`).
- Redis is required for cross-instance fan-out (API pod → gateway → browser).
- Socket.IO falls back to long-polling if WebSocket is blocked.
- Unread poll interval: **off while socket connected**; **60s** when disconnected (bell safety net only).
- Reconnect triggers a one-time broad refetch (Redis does not replay missed events).

## Edge cases

- Malformed Redis payloads are ignored by the gateway.
- Multiple tabs share one Redis subscription per user on the server (ref-counted).
- Notification click navigates via `metadata.href` when present (dropdown + inbox page).
