# Timer feature spec

## User-visible outcome

- **Members** start one active timer per user, pause/resume, stop to create a time log, or discard without logging.
- **Stale auto-stop** ends timers that exceed workspace/client hard limits (e.g. 12h) and surfaces a dialog on next visit.
- **Admins** see active timer count on team live via `GET /timer/active-count`.

## API

| Method | Route                 | Contract                                                      |
| ------ | --------------------- | ------------------------------------------------------------- |
| POST   | `/timer/start`        | [timer.dto.ts](../../packages/contracts/src/dto/timer.dto.ts) |
| POST   | `/timer/stop`         | timer.dto (`description`, `isBillable` optional)              |
| POST   | `/timer/pause`        | timer.dto                                                     |
| POST   | `/timer/resume`       | —                                                             |
| POST   | `/timer/discard`      | —                                                             |
| GET    | `/timer/active`       | `activeTimerSchema` (elapsed, pause state)                    |
| GET    | `/timer/active-count` | ADMIN — `activeTimerCountSchema`                              |

Controller: [timer.controller.ts](../../apps/api/src/modules/timer/interface/http/timer.controller.ts)

State stored in Redis (or in-memory when `REDIS_USE_MEMORY=true`).

## Given / When / Then

### Start

**Given** a member with an active workspace and at least one task  
**When** they POST `/timer/start` with `taskId`  
**Then** Redis stores one active timer per user; overlapping start returns conflict.

### Pause / resume

**When** they POST `/timer/pause` while running  
**Then** `isPaused: true`, elapsed stops accumulating until resume.

**When** they POST `/timer/resume` while paused  
**Then** timer continues from accumulated elapsed time.

### Stop

**When** they POST `/timer/stop`  
**Then** a `TimeLog` is created with `source: timer`; timer key is cleared.

**When** PATCH `/timelogs/:id` on a timer-sourced entry  
**Then** `403 TIMELOG_NOT_EDITABLE` (delete allowed when period is editable).

### Discard

**When** they POST `/timer/discard`  
**Then** active timer is cleared with no time log created.

### Stale auto-stop

**When** elapsed exceeds configured hard limit (client env `NEXT_PUBLIC_HARD_AUTO_STOP_HOURS`, server policy)  
**Then** timer stops automatically; client shows recovery dialog with stopped duration.

## UI

- Client timer: [apps/client/src/features/timer/](../../apps/client/src/features/timer/)
- Sequence diagram: [TIMER_SEQUENCE.md](../architecture/TIMER_SEQUENCE.md)

## Edge cases

- Browser tab title syncs with active timer elapsed time.
- Keyboard shortcut: `Space` toggles start/stop where focused.
- Token refresh in another tab reconnects notification socket but does not affect timer Redis state.
