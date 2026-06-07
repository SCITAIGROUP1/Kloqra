# Plan: Stale Timer Warning & Auto-Stop

**Created:** 2026-06-06  
**Parent Plan:** `timer_pause_resume_ui_redesign.plan.md`  
**Scope:** Detect timers running beyond a configurable threshold; warn the member with a confirmation dialog; optionally auto-stop after a hard ceiling.

---

## Problem

A member starts a timer, gets distracted, leaves for the day, or simply forgets. The timer silently accrues hours — inflating time logs, skewing analytics, and making approval harder.

Two behaviors are needed:

| Trigger                                                   | Action                                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| Timer exceeds **soft threshold** (e.g. 8 h, configurable) | Warn the member with a dialog: Keep running / Stop now / Discard |
| Timer exceeds **hard ceiling** (e.g. 14 h, fixed)         | Backend auto-stops the timer and writes a capped log             |

---

## Architecture Overview

```
Browser tab (client polling /timer/active every 30s)
    └── detects elapsedSec > softThreshold
        └── shows <StaleTimerDialog /> with 3 options

Backend worker (setInterval every 60s, same pattern as ExportScheduleService)
    └── scans all workspace:user Redis keys
    └── any timer where totalElapsed > HARD_CEILING_HOURS
        └── auto-stop → writes TimeLog → deletes Redis key → publishes presence event
        └── stores a "stale_autostopped" flag in Redis for 1h so client can show a toast
```

No `@nestjs/schedule` needed — we already use `setInterval` in `OnModuleInit` (see `ExportScheduleService` pattern).

---

## Design Decisions

### Soft Threshold — Client-side detection

The client already polls `/timer/active` every time the `TimerPage` mounts. We extend this to a **30-second background interval** that checks `elapsedSec` against the workspace setting. If exceeded → show modal. No new API endpoints needed for the warning itself.

### Hard Ceiling — Backend worker

Fixed at **14 hours** (not user-configurable — it's a safety net, not a policy). The worker runs every 60 seconds (same cadence as the export schedule worker). When it fires a stale stop, it writes a special `source: "timer_autostopped"` on the TimeLog so admins can filter these.

### Three choices in the confirmation dialog

1. **Keep running** — dismiss, re-check again in 1 hour
2. **Stop & save** — call the existing `POST /timer/stop` with the current description
3. **Discard** — call a new `POST /timer/discard` that deletes the Redis key without writing any TimeLog

### Configurable soft threshold via workspace settings

Add `timerStaleWarningHours` to `WorkspaceSettings`. Default: `8`. Admins can change it in workspace settings. The client reads this from the workspace settings it already fetches.

---

## Module Breakdown

---

### MODULE A — Contracts: `packages/contracts`

**Files changed:** 3

---

#### A.1 `src/routes.ts`

```diff
 TIMER: {
   START: "/timer/start",
   STOP: "/timer/stop",
   ACTIVE: "/timer/active",
   ACTIVE_COUNT: "/timer/active-count",
   PAUSE: "/timer/pause",       // from pause/resume plan
   RESUME: "/timer/resume",     // from pause/resume plan
+  DISCARD: "/timer/discard",
 },
```

---

#### A.2 `src/workspace-settings.ts`

Add the configurable soft-warning threshold:

```diff
 export const workspaceSettingsSchema = z.object({
   logoUrl: z.string().url().optional(),
   exportFooterNote: z.string().max(500).optional(),
   weekStart: z.enum(["monday", "sunday"]).optional(),
   timesheetApprovalPeriod: timesheetApprovalPeriodSchema.optional(),
   expectedWeeklyHours: z.number().positive().optional(),
   dailyTargetHours: z.number().positive().max(24).optional(),
   roundingMinutes: z.number().int().nonnegative().optional(),
   timezone: z.string().optional(),
+  timerStaleWarningHours: z.number().positive().max(12).optional(),
 }).passthrough();

+export const DEFAULT_STALE_WARNING_HOURS = 8;
+export const HARD_AUTO_STOP_HOURS = 14;  // never exceeds this regardless of settings
```

---

#### A.3 `src/errors.ts`

```diff
  TIMER_ALREADY_ACTIVE: "TIMER_ALREADY_ACTIVE",
  TIMER_NOT_ACTIVE: "TIMER_NOT_ACTIVE",
  TIMER_ALREADY_PAUSED: "TIMER_ALREADY_PAUSED",   // from pause/resume plan
  TIMER_NOT_PAUSED: "TIMER_NOT_PAUSED",            // from pause/resume plan
+ TIMER_AUTOSTOPPED: "TIMER_AUTOSTOPPED",
```

---

### MODULE B — Backend: Timer Service `apps/api/src/modules/timer`

**Files changed:** 2

---

#### B.1 `application/timer.service.ts`

**Add `discard()` method:**

Deletes the Redis key without writing any TimeLog. No audit event, no presence update (timer was forgotten — treat as never happened).

```typescript
async discard(workspaceId: string, userId: string) {
  const raw = await this.redis.getClient().get(this.key(workspaceId, userId));
  if (!raw) {
    throw new DomainException(ErrorCodes.TIMER_NOT_ACTIVE, "No active timer", HttpStatus.BAD_REQUEST);
  }
  await this.redis.getClient().del(this.key(workspaceId, userId));
  await this.redis.getClient().publish(
    `presence:${workspaceId}`,
    JSON.stringify({ type: "stop", userId })
  );
  return { discarded: true };
}
```

---

#### B.2 `interface/http/timer.controller.ts`

```diff
+  @Post(ROUTES.TIMER.DISCARD)
+  @HttpCode(HttpStatus.OK)
+  discard(@CurrentUser() user: RequestUser) {
+    return this.timer.discard(user.workspaceId, user.userId);
+  }
```

---

### MODULE C — Backend: Stale Timer Worker (NEW FILE)

**Files changed:** 3 (new service, register in module, register in app module)

---

#### C.1 `application/stale-timer.service.ts` [NEW]

Pattern: identical lifecycle to `ExportScheduleService` — `OnModuleInit` / `OnModuleDestroy` with a plain `setInterval`.

```typescript
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { HARD_AUTO_STOP_HOURS } from "@chronomint/contracts";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";
import { TimelogAuditService } from "../../timelogs/application/timelog-audit.service";

const TICK_MS = 60_000; // check every 60 seconds

interface TimerState {
  userId: string;
  workspaceId: string;
  taskId: string;
  startedAt: string;
  accumulatedSec: number;
  isPaused: boolean;
  pausedAt: string | null;
}

@Injectable()
export class StaleTimerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StaleTimerService.name);
  private ticker: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private audit: TimelogAuditService
  ) {}

  onModuleInit() {
    this.ticker = setInterval(() => {
      void this.scanAndAutoStop().catch((err: unknown) => {
        this.logger.error(
          `Stale timer scan failed: ${err instanceof Error ? err.message : String(err)}`
        );
      });
    }, TICK_MS);
  }

  onModuleDestroy() {
    if (this.ticker) clearInterval(this.ticker);
  }

  async scanAndAutoStop() {
    // Get all workspace:user timer keys from Redis
    const keys = await this.redis.getClient().keys("timer:*:*");
    const hardCeilingSec = HARD_AUTO_STOP_HOURS * 3600;

    for (const key of keys) {
      const raw = await this.redis.getClient().get(key);
      if (!raw) continue;

      let state: TimerState;
      try {
        state = JSON.parse(raw) as TimerState;
      } catch {
        continue;
      }

      if (!state.startedAt || !state.userId || !state.workspaceId || !state.taskId) continue;

      // Calculate total elapsed (same logic as active())
      const accumulated = state.accumulatedSec ?? 0;
      let totalElapsedSec: number;

      if (state.isPaused) {
        totalElapsedSec = accumulated;
      } else {
        const startedMs = new Date(state.startedAt).getTime();
        const currentSec = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
        totalElapsedSec = accumulated + currentSec;
      }

      if (totalElapsedSec < hardCeilingSec) continue;

      // Auto-stop: write a TimeLog capped at HARD_AUTO_STOP_HOURS
      await this.autoStop(state, key, hardCeilingSec);
    }
  }

  private async autoStop(state: TimerState, redisKey: string, capSec: number) {
    try {
      const task = await this.prisma.task.findUnique({ where: { id: state.taskId } });
      if (!task) {
        // Task deleted — just clean up Redis
        await this.redis.getClient().del(redisKey);
        return;
      }

      const end = new Date();
      const start = new Date(end.getTime() - capSec * 1000);

      await this.prisma.$transaction(async (tx) => {
        const log = await tx.timeLog.create({
          data: {
            userId: state.userId,
            taskId: state.taskId,
            startTime: start,
            endTime: end,
            durationSec: capSec,
            description: null,
            isBillable: task.billableDefault,
            source: "timer_autostopped" // distinguishable in admin reports
          }
        });
        await this.audit.recordEvent(tx, {
          workspaceId: state.workspaceId,
          timeLogId: log.id,
          entryUserId: state.userId,
          actorId: state.userId,
          action: "CREATE",
          before: null,
          after: this.audit.snapshotFromLog(log)
        });
      });

      // Store a notification flag in Redis so the client can show a toast when it polls
      // Expires in 2 hours — plenty of time for client to pick it up
      await this.redis
        .getClient()
        .set(
          `timer_autostopped:${state.workspaceId}:${state.userId}`,
          JSON.stringify({ stoppedAt: end.toISOString(), durationSec: capSec }),
          "EX",
          7200
        );

      await this.redis.getClient().del(redisKey);
      await this.redis
        .getClient()
        .publish(
          `presence:${state.workspaceId}`,
          JSON.stringify({ type: "stop", userId: state.userId })
        );

      this.logger.warn(
        `Auto-stopped stale timer for user ${state.userId} in workspace ${state.workspaceId} after ${capSec}s`
      );
    } catch (err) {
      this.logger.error(
        `Failed to auto-stop timer ${redisKey}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
```

---

#### C.2 `timer.module.ts`

```diff
+import { StaleTimerService } from "./application/stale-timer.service";

 @Module({
   imports: [AuthModule, ProjectsModule, TimelogsModule],
   controllers: [TimerController],
-  providers: [TimerService]
+  providers: [TimerService, StaleTimerService]
 })
 export class TimerModule {}
```

---

### MODULE D — Backend: New `/timer/active` response field

**Files changed:** 1

---

#### D.1 `timer.service.ts` — `active()` method

When the client polls, if a `timer_autostopped` key exists in Redis for this user, fold it into the response so the client knows to show the "Your timer was auto-stopped" toast. Clears the key once sent.

```diff
 async active(workspaceId: string, userId: string) {
   const raw = await this.redis.getClient().get(this.key(workspaceId, userId));
+
+  // Check if the worker auto-stopped a timer since the last poll
+  const autostopKey = `timer_autostopped:${workspaceId}:${userId}`;
+  const autostopRaw = await this.redis.getClient().get(autostopKey);
+  if (autostopRaw) {
+    await this.redis.getClient().del(autostopKey);
+    return { autostopped: true, ...JSON.parse(autostopRaw) };
+  }
+
   if (!raw) return null;
   // ... rest of existing logic ...
```

Update `activeTimerSchema` in contracts to allow the `autostopped` shape:

```diff
+export const autoStoppedTimerSchema = z.object({
+  autostopped: z.literal(true),
+  stoppedAt: isoDatetimeSchema,
+  durationSec: z.number().int().nonnegative(),
+});
+
 export type ActiveTimerDto = z.infer<typeof activeTimerSchema>;
+export type AutoStoppedTimerDto = z.infer<typeof autoStoppedTimerSchema>;
```

---

### MODULE E — Client: Stale Timer Detection

**Files changed:** 2 (new component + timer-page.tsx)

---

#### E.1 `features/timer/stale-timer-dialog.tsx` [NEW]

A self-contained dialog component. Shows when the timer is running long. Three clear CTAs.

```typescript
"use client";
import { AlertDialog, AlertDialogContent, AlertDialogHeader,
         AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
         AlertDialogCancel, AlertDialogAction, Button } from "@chronomint/ui";
import { Clock, Trash2, Square } from "lucide-react";

interface StaleTimerDialogProps {
  open: boolean;
  elapsedHours: number;
  thresholdHours: number;
  onKeepRunning: () => void;   // dismiss, snooze for 1h
  onStopAndSave: () => void;   // call stop()
  onDiscard: () => void;       // call discard()
}

export function StaleTimerDialog({
  open, elapsedHours, thresholdHours,
  onKeepRunning, onStopAndSave, onDiscard
}: StaleTimerDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/15">
              <Clock className="size-5 text-amber-500" />
            </span>
            <AlertDialogTitle>Timer still running</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Your timer has been running for <strong>{elapsedHours.toFixed(1)} hours</strong>,
            which exceeds your {thresholdHours}h daily target. Did you forget to stop it?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction asChild>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onKeepRunning}
            >
              Keep running — I'm still working
            </Button>
          </AlertDialogAction>
          <AlertDialogAction asChild>
            <Button variant="outline" className="w-full" onClick={onStopAndSave}>
              <Square className="size-4 mr-2 fill-current" />
              Stop & save logged time
            </Button>
          </AlertDialogAction>
          <AlertDialogCancel asChild>
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDiscard}
            >
              <Trash2 className="size-4 mr-2" />
              Discard — timer was left running by mistake
            </Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

#### E.2 `features/timer/timer-page.tsx`

**State additions:**

```typescript
const [showStaleDialog, setShowStaleDialog] = useState(false);
const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null); // epoch ms
const staleWarningHours = 8; // read from workspace settings (fetch on mount)
```

**Polling logic — extend the existing 30s-tick useEffect:**

The timer already ticks every second. Add a separate effect that checks elapsed vs threshold every time `elapsedSec` changes, but only fires the dialog if not snoozed:

```typescript
useEffect(() => {
  if (!tracking || !active) return;
  const thresholdSec = staleWarningHours * 3600;
  if (elapsedSec < thresholdSec) return;
  if (snoozedUntil && Date.now() < snoozedUntil) return;
  setShowStaleDialog(true);
}, [elapsedSec, tracking, staleWarningHours, snoozedUntil, active]);
```

**Poll for auto-stop notification:**  
Extend the existing `fetchActive` polling to handle the `autostopped` response shape:

```typescript
// In the polling useEffect
const result = await api<ActiveTimerDto | AutoStoppedTimerDto | null>(ROUTES.TIMER.ACTIVE, {
  workspaceId: ws
});
if (result && "autostopped" in result && result.autostopped) {
  setActive(null);
  toast.warning(
    `Your timer was automatically stopped after ${HARD_AUTO_STOP_HOURS} hours. 
     A time entry was saved on your behalf.`,
    { duration: 8000 }
  );
  void fetchTodayLogs();
  return;
}
setActive(result as ActiveTimerDto | null);
```

**Dialog handlers:**

```typescript
const handleKeepRunning = () => {
  setShowStaleDialog(false);
  setSnoozedUntil(Date.now() + 60 * 60 * 1000); // snooze 1 hour
};

const handleStopAndSave = async () => {
  setShowStaleDialog(false);
  await stopTimer();
};

const handleDiscard = async () => {
  setShowStaleDialog(false);
  try {
    await api(ROUTES.TIMER.DISCARD, { method: "POST", workspaceId: ws });
    setActive(null);
    toast.info("Timer discarded. No time was logged.");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Could not discard timer");
  }
};
```

**Render the dialog alongside the card:**

```tsx
<StaleTimerDialog
  open={showStaleDialog}
  elapsedHours={elapsedSec / 3600}
  thresholdHours={staleWarningHours}
  onKeepRunning={handleKeepRunning}
  onStopAndSave={handleStopAndSave}
  onDiscard={handleDiscard}
/>
```

---

## Execution Order

```
MODULE A (contracts) — errors, routes, workspace-settings
   ↓
MODULE D (contracts/timer.dto.ts) — AutoStoppedTimerDto
   ↓
MODULE B (api/timer.service.ts + controller) — discard(), active() autostopped flag
MODULE C (api/stale-timer.service.ts) — worker, register in module
   ↓
MODULE E (client/stale-timer-dialog.tsx) — new component
MODULE E (client/timer-page.tsx) — wire dialog + poll handler
```

---

## Stale Source Tag in TimeLog

The backend worker writes `source: "timer_autostopped"`. This flows through to admin reports and the export engine without any schema changes (the field is a free string already). Admin can filter `source = timer_autostopped` in time log queries to audit how often this happens.

---

## Verification Checklist

- [ ] Start a timer, manually set `timerStaleWarningHours: 0.01` in workspace settings (≈36 seconds) → dialog appears
- [ ] Click **Keep running** → dialog dismisses, re-appears after 1 hour snooze
- [ ] Click **Stop & save** → standard TimeLog created, timer cleared
- [ ] Click **Discard** → no TimeLog created, timer Redis key deleted, "No time was logged" toast
- [ ] Simulate auto-stop: seed a Redis key with `startedAt` 15 hours ago, wait for worker tick → TimeLog written with `source=timer_autostopped`, next poll returns `{ autostopped: true }`, toast shows
- [ ] `npx pnpm typecheck && npx pnpm lint` — zero errors

---

## What This Does NOT Do

- **No email notification** — members are assumed to be at the computer when the dialog fires; email adds complexity and noise
- **No admin-facing alert** — admins can query `source=timer_autostopped` logs already
- **Does not override pause state** — a paused timer won't keep accumulating toward the hard ceiling (accumulated seconds only, no current segment)
