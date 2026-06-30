# Plan: Timer Pause/Resume + Timer Page UI Redesign

**Created:** 2026-06-06  
**Author:** Antigravity  
**Scope:** Active timer pause/resume (short breaks like lunch / BRB), and a full redesign of the client Timer Page to use viewport space efficiently.

---

## Background & Problem Statement

### Current Pain Points

1. **No pause capability** — when a member steps away for a short break (lunch, BRB, standup call), they must either:
   - Let the timer keep running (inflates time logs), or
   - Stop the timer and start a new one (creates fragmented time log records and breaks analytics)
2. **Timer page is not space-efficient** — the entire UI is constrained in a narrow `max-w-lg` centered column, even on widescreen displays, forcing the user to scroll past the clock to reach Quick Actions and Daily Progress

### Goals

- Introduce **Pause / Resume** as a first-class operation on an active timer
- Store pause state entirely in **Redis** (no database migrations needed)
- Produce a single consolidated `TimeLog` record on Stop (no fragmentation)
- Reflect paused presence visually in the Admin dashboard's live feed
- Redesign the Timer Page into a **responsive two-column layout** that uses horizontal space

---

## Design Decisions

### Pause Model: "Accumulated Seconds" in Redis

Rather than storing multiple segments, the Redis timer state gains two new fields:

- `accumulatedSec: number` — total active seconds across all segments before the current one
- `isPaused: boolean` — whether the timer is currently paused
- `pausedAt: string | null` — ISO timestamp of when the timer was last paused

**On Pause:** `accumulatedSec += floor((now - startedAt) / 1000)`, then set `isPaused = true`, `pausedAt = now`.  
**On Resume:** reset `startedAt = now`, set `isPaused = false`, `pausedAt = null`.  
**On Stop (while running):** `totalSec = accumulatedSec + floor((now - startedAt) / 1000)`  
**On Stop (while paused):** `totalSec = accumulatedSec`  
**TimeLog written:** `startTime = endTime - totalSec` (single clean record)

**Elapsed shown to client:**

- Running: `accumulatedSec + floor((now - startedAt) / 1000)`
- Paused: `accumulatedSec`

### Why Redis, not Postgres?

Pause state is **ephemeral intent**, not a completed work record. Pause/resume happens multiple times per session. Only the final total matters for billing and reporting. Adding DB rows per-pause would bloat the `time_logs` table and complicate analytics.

---

## Module Breakdown

---

### MODULE 1: Shared Contracts — `packages/contracts`

**Files changed:** 3

---

#### 1.1 `src/errors.ts`

Add two new error codes for invalid pause/resume transitions:

```diff
  TIMER_ALREADY_ACTIVE: "TIMER_ALREADY_ACTIVE",
  TIMER_NOT_ACTIVE: "TIMER_NOT_ACTIVE",
+ TIMER_ALREADY_PAUSED: "TIMER_ALREADY_PAUSED",
+ TIMER_NOT_PAUSED: "TIMER_NOT_PAUSED",
  TIMELOG_NOT_EDITABLE: "TIMELOG_NOT_EDITABLE",
```

No schema changes needed — these are just constants that get sent in API error bodies.

---

#### 1.2 `src/dto/timer.dto.ts`

Extend `activeTimerSchema` to carry pause state the frontend needs for rendering. Add a `pauseTimerSchema` (empty body, just validates the request structure).

```diff
 export const activeTimerSchema = z.object({
   userId: uuidSchema,
   workspaceId: uuidSchema,
   taskId: uuidSchema,
   startedAt: isoDatetimeSchema,
   elapsedSec: z.number().int().nonnegative(),
+  isPaused: z.boolean().optional(),
+  pausedAt: isoDatetimeSchema.nullable().optional(),
+  accumulatedSec: z.number().int().nonnegative().optional(),
 });

+export const pauseTimerSchema = z.object({});
+export type PauseTimerDto = z.infer<typeof pauseTimerSchema>;
```

---

#### 1.3 `src/routes.ts`

Add pause and resume routes inside `TIMER`:

```diff
 TIMER: {
   START: "/timer/start",
   STOP: "/timer/stop",
   ACTIVE: "/timer/active",
   ACTIVE_COUNT: "/timer/active-count",
+  PAUSE: "/timer/pause",
+  RESUME: "/timer/resume",
 },
```

---

### MODULE 2: Presence Contract — `packages/contracts`

**Files changed:** 1

---

#### 2.1 `src/dto/presence.dto.ts`

Admin dashboard live feed should show paused members differently (e.g., grayed out, "On break" badge):

```diff
 export const presenceMemberSchema = z.object({
   userId: uuidSchema,
   userName: z.string(),
   taskId: uuidSchema,
   taskName: z.string(),
   projectName: z.string(),
   startedAt: isoDatetimeSchema,
+  isPaused: z.boolean().optional(),
 });
```

---

### MODULE 3: Backend — Timer Service `apps/api/src/modules/timer`

**Files changed:** 2

---

#### 3.1 `application/timer.service.ts`

This is the core business logic change.

**Step 1 — Extend the internal `TimerState` interface** (private, never serialized to clients directly):

```typescript
interface TimerState {
  userId: string;
  workspaceId: string;
  taskId: string;
  startedAt: string; // ISO — when the current running segment started
  accumulatedSec: number; // Total active seconds from all prior completed segments
  isPaused: boolean;
  pausedAt: string | null; // ISO — when the current pause began
}
```

**Step 2 — Update `start()` method** to initialize new fields at zero:

```typescript
const state: TimerState = {
  userId,
  workspaceId,
  taskId: dto.taskId,
  startedAt: new Date().toISOString(),
  accumulatedSec: 0, // NEW
  isPaused: false, // NEW
  pausedAt: null // NEW
};
```

Return value also needs `isPaused: false`:

```typescript
return {
  userId,
  workspaceId,
  taskId: dto.taskId,
  startedAt: state.startedAt,
  elapsedSec: 0,
  isPaused: false
};
```

**Step 3 — Update `active()` method** to calculate elapsed correctly and include pause state:

```typescript
async active(workspaceId: string, userId: string) {
  const raw = await this.redis.getClient().get(this.key(workspaceId, userId));
  if (!raw) return null;
  const state = JSON.parse(raw) as Partial<TimerState>;
  // ... existing validation ...

  const accumulated = state.accumulatedSec ?? 0;
  let elapsedSec: number;

  if (state.isPaused) {
    // Paused: elapsed is just the accumulated seconds, clock has stopped
    elapsedSec = accumulated;
  } else {
    // Running: accumulated + current segment
    const startedMs = new Date(state.startedAt!).getTime();
    const currentSegmentSec = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
    elapsedSec = accumulated + currentSegmentSec;
  }

  return {
    userId: state.userId,
    workspaceId: state.workspaceId,
    taskId: state.taskId,
    startedAt: state.startedAt,
    elapsedSec,
    isPaused: state.isPaused ?? false,
    pausedAt: state.pausedAt ?? null,
    accumulatedSec: accumulated,
  };
}
```

**Step 4 — Add `pause()` method:**

```typescript
async pause(workspaceId: string, userId: string) {
  const raw = await this.redis.getClient().get(this.key(workspaceId, userId));
  if (!raw) {
    throw new DomainException(ErrorCodes.TIMER_NOT_ACTIVE, "No active timer", HttpStatus.BAD_REQUEST);
  }
  const state = JSON.parse(raw) as TimerState;
  if (state.isPaused) {
    throw new DomainException(ErrorCodes.TIMER_ALREADY_PAUSED, "Timer is already paused", HttpStatus.CONFLICT);
  }

  const now = new Date();
  const startedMs = new Date(state.startedAt).getTime();
  const segmentSec = Math.max(0, Math.floor((now.getTime() - startedMs) / 1000));
  const newAccumulated = (state.accumulatedSec ?? 0) + segmentSec;

  const updated: TimerState = {
    ...state,
    accumulatedSec: newAccumulated,
    isPaused: true,
    pausedAt: now.toISOString(),
  };

  await this.redis.getClient().set(this.key(workspaceId, userId), JSON.stringify(updated));
  await this.redis.getClient().publish(`presence:${workspaceId}`, JSON.stringify({ type: "pause", userId }));

  return { isPaused: true, elapsedSec: newAccumulated, pausedAt: updated.pausedAt };
}
```

**Step 5 — Add `resume()` method:**

```typescript
async resume(workspaceId: string, userId: string) {
  const raw = await this.redis.getClient().get(this.key(workspaceId, userId));
  if (!raw) {
    throw new DomainException(ErrorCodes.TIMER_NOT_ACTIVE, "No active timer", HttpStatus.BAD_REQUEST);
  }
  const state = JSON.parse(raw) as TimerState;
  if (!state.isPaused) {
    throw new DomainException(ErrorCodes.TIMER_NOT_PAUSED, "Timer is not paused", HttpStatus.CONFLICT);
  }

  const now = new Date();
  const updated: TimerState = {
    ...state,
    startedAt: now.toISOString(),   // New segment starts from now
    isPaused: false,
    pausedAt: null,
    // accumulatedSec stays as is — already tallied during pause
  };

  await this.redis.getClient().set(this.key(workspaceId, userId), JSON.stringify(updated));
  await this.redis.getClient().publish(`presence:${workspaceId}`, JSON.stringify({ type: "resume", userId }));

  return { isPaused: false, elapsedSec: updated.accumulatedSec, startedAt: updated.startedAt };
}
```

**Step 6 — Update `stop()` method** to use accumulated time for final TimeLog:

```typescript
async stop(workspaceId: string, userId: string, dto: StopTimerDto) {
  const raw = await this.redis.getClient().get(this.key(workspaceId, userId));
  if (!raw) throw new DomainException(ErrorCodes.TIMER_NOT_ACTIVE, "No active timer", HttpStatus.BAD_REQUEST);

  const state = JSON.parse(raw) as TimerState;
  const task = await this.prisma.task.findUniqueOrThrow({ where: { id: state.taskId } });

  // Calculate total active seconds
  let totalSec: number;
  const end = new Date();
  const accumulated = state.accumulatedSec ?? 0;

  if (state.isPaused) {
    // Stopped while paused: no current segment to add
    totalSec = accumulated;
  } else {
    // Stopped while running: add current segment
    const startedMs = new Date(state.startedAt).getTime();
    const currentSegmentSec = Math.max(0, Math.floor((end.getTime() - startedMs) / 1000));
    totalSec = accumulated + currentSegmentSec;
  }

  // Compute a synthetic startTime so startTime = endTime - totalSec
  // This keeps the time log as a single clean contiguous block
  const start = new Date(end.getTime() - totalSec * 1000);

  await this.timesheetLock.assertTaskPeriodEditable(userId, state.taskId, start);

  const log = await this.prisma.$transaction(async (tx) => {
    const created = await tx.timeLog.create({
      data: {
        userId,
        taskId: state.taskId,
        startTime: start,          // Synthetic start = end - totalSec
        endTime: end,
        durationSec: totalSec,
        description: dto.description,
        isBillable: dto.isBillable ?? task.billableDefault,
        source: "timer"
      }
    });
    await this.audit.recordEvent(tx, {
      workspaceId,
      timeLogId: created.id,
      entryUserId: userId,
      actorId: userId,
      action: "CREATE",
      before: null,
      after: this.audit.snapshotFromLog(created)
    });
    return created;
  });

  await this.redis.getClient().del(this.key(workspaceId, userId));
  await this.redis.getClient().publish(`presence:${workspaceId}`, JSON.stringify({ type: "stop", userId }));

  return {
    id: log.id,
    userId: log.userId,
    taskId: log.taskId,
    startTime: log.startTime.toISOString(),
    endTime: log.endTime.toISOString(),
    durationSec: log.durationSec,
    description: log.description,
    isBillable: log.isBillable,
    source: "timer" as const
  };
}
```

---

#### 3.2 `interface/http/timer.controller.ts`

Add two new POST endpoints. No body validation needed (pause/resume take no input besides the authenticated user):

```diff
 import { startTimerSchema, stopTimerSchema, ROUTES } from "@kloqra/contracts";
-import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
+import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";

 // ... existing endpoints ...

+  @Post(ROUTES.TIMER.PAUSE)
+  @HttpCode(HttpStatus.OK)
+  pause(@CurrentUser() user: RequestUser) {
+    return this.timer.pause(user.workspaceId, user.userId);
+  }
+
+  @Post(ROUTES.TIMER.RESUME)
+  @HttpCode(HttpStatus.OK)
+  resume(@CurrentUser() user: RequestUser) {
+    return this.timer.resume(user.workspaceId, user.userId);
+  }
```

---

### MODULE 4: Backend — Presence Service `apps/api/src/modules/presence`

**Files changed:** 1

---

#### 4.1 `application/presence.service.ts`

The `snapshot()` method scans Redis for active timers. It needs to pass `isPaused` through to the admin dashboard live feed:

```diff
 for (const state of timerStates) {
   const task = taskById.get(state.taskId);
   if (!task) continue;
   active.push({
     userId: state.userId,
     userName: state.userName,
     taskId: task.id,
     taskName: task.taskName,
     projectName: task.project.name,
     startedAt: state.startedAt,
+    isPaused: state.isPaused ?? false,
   });
 }
```

The `timerStates` push also needs to carry `isPaused`:

```diff
 timerStates.push({
   userId: m.userId,
   userName: m.user.name,
   taskId: state.taskId,
   startedAt: state.startedAt,
+  isPaused: state.isPaused ?? false,
 });
```

---

### MODULE 5: Client Store — `apps/client/src/stores/timer.store.ts`

**Files changed:** 1

The store needs to understand pause state so the `tick()` function doesn't increment the clock while paused, and `elapsedSec` correctly reflects pause-accumulated time.

**Changes:**

```diff
 interface TimerState {
   active: ActiveTimerDto | null;
   elapsedSec: number;
+  isPaused: boolean;
   setActive: (t: ActiveTimerDto | null) => void;
   tick: () => void;
 }

 function elapsedFromActive(active: ActiveTimerDto | null): number {
   if (!active) return 0;
-  const startedMs = new Date(active.startedAt).getTime();
-  if (Number.isFinite(startedMs)) {
-    return Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
-  }
-  const fromApi = active.elapsedSec;
-  return Number.isFinite(fromApi) && fromApi >= 0 ? fromApi : 0;
+  // If paused, just return the accumulated value from the server — clock is frozen
+  if (active.isPaused) {
+    return active.elapsedSec;
+  }
+  // Running: derive from startedAt to get a live, smooth increment
+  const accumulated = active.accumulatedSec ?? 0;
+  const startedMs = new Date(active.startedAt).getTime();
+  if (Number.isFinite(startedMs)) {
+    const currentSegmentSec = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
+    return accumulated + currentSegmentSec;
+  }
+  return active.elapsedSec;
 }

 export const useTimerStore = create<TimerState>((set, get) => ({
   active: null,
   elapsedSec: 0,
+  isPaused: false,
   setActive: (active) => {
     const normalized = normalizeActiveTimer(active);
     set({
       active: normalized,
       elapsedSec: elapsedFromActive(normalized),
+      isPaused: normalized?.isPaused ?? false,
     });
   },
   tick: () => {
     const { active } = get();
-    if (!isActiveTimer(active)) return;
+    if (!isActiveTimer(active) || active.isPaused) return;  // No tick while paused
     set({ elapsedSec: elapsedFromActive(active) });
   }
 }));
```

---

### MODULE 6: Client Timer Page — `apps/client/src/features/timer/timer-page.tsx`

**Files changed:** 1 (major refactor)

This is the most visible change. The file currently renders a single `max-w-lg` centered column.

---

#### 6.1 API functions: `pauseTimer()` and `resumeTimer()`

Add two new async handlers alongside `startTimer()` and `stopTimer()`:

```typescript
const [pausing, setPausing] = useState(false);
const [resuming, setResuming] = useState(false);

async function pauseTimer() {
  setPausing(true);
  setError(null);
  try {
    const res = await api<{ isPaused: boolean; elapsedSec: number }>(ROUTES.TIMER.PAUSE, {
      method: "POST",
      workspaceId: ws
    });
    // Re-fetch active timer to get the updated state with isPaused=true
    const updated = await api<ActiveTimerDto | null>(ROUTES.TIMER.ACTIVE, { workspaceId: ws });
    setActive(updated);
    toast.success("Timer paused. Enjoy your break!");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Could not pause timer");
  } finally {
    setPausing(false);
  }
}

async function resumeTimer() {
  setResuming(true);
  setError(null);
  try {
    await api(ROUTES.TIMER.RESUME, { method: "POST", workspaceId: ws });
    const updated = await api<ActiveTimerDto | null>(ROUTES.TIMER.ACTIVE, { workspaceId: ws });
    setActive(updated);
    toast.success("Timer resumed. Welcome back!");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Could not resume timer");
  } finally {
    setResuming(false);
  }
}
```

---

#### 6.2 `TimerRing` component update

The ring should visually distinguish between running and paused states:

```typescript
function TimerRing({ elapsedSec, active, isPaused = false, size = 200 }: {
  elapsedSec: number;
  active: boolean;
  isPaused?: boolean;
  size?: number;
}) {
  // Paused ring: amber/orange stroke instead of primary
  // Active ring: primary stroke with glow pulse
  // Inactive ring: muted stroke
  const strokeClass = !active
    ? "stroke-muted"
    : isPaused
      ? "stroke-amber-500"
      : "stroke-primary transition-all duration-1000 ease-linear";

  // ... SVG rendering ...

  // Inner label
  {active && isPaused && (
    <span className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-500">
      <PauseIcon className="size-3" />
      Paused
    </span>
  )}
  {active && !isPaused && (
    <span className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
      <span className="size-1.5 rounded-full bg-primary animate-pulse" />
      Recording
    </span>
  )}
}
```

---

#### 6.3 Layout redesign: dual-column responsive grid

Replace the outer `div` wrapper:

```diff
-<div className="mx-auto max-w-lg space-y-4">
+<div className="mx-auto max-w-6xl px-4">
+  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
```

Left column (timer card) — takes 7 of 12 columns on large screens:

```tsx
<div className="lg:col-span-7">
  <Card>
    {/* Header with project/task info */}
    <CardHeader> ... </CardHeader>
    <CardContent className="space-y-4">
      {/* Ring — smaller on dual-column: size 180 instead of 200 */}
      <div className="flex justify-center py-4">
        <TimerRing
          elapsedSec={elapsedSec}
          active={tracking}
          isPaused={isPaused}
          size={180}
        />
      </div>

      {/* Status chips / keyboard hint */}

      {/* Tracking mode: note, billable, action buttons */}
      {tracking ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stop-description">Note (optional)</Label>
            <Input ... />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            {/* Billable checkbox */}
          </label>
          {/* Action row: Pause + Stop side by side */}
          <div className="grid grid-cols-2 gap-3">
            {isPaused ? (
              <Button
                onClick={resumeTimer}
                disabled={resuming || stopping}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Play className="size-4 mr-1.5" />
                {resuming ? "Resuming…" : "Resume"}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={pauseTimer}
                disabled={pausing || stopping}
                className="w-full border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
              >
                <Pause className="size-4 mr-1.5" />
                {pausing ? "Pausing…" : "Pause break"}
              </Button>
            )}
            <Button
              variant="destructive"
              className="w-full"
              onClick={stopTimer}
              disabled={stopping || pausing || resuming}
            >
              <Square className="size-4 mr-1.5 fill-current" />
              {stopping ? "Stopping…" : "Stop & save"}
            </Button>
          </div>
          {/* Paused state contextual hint */}
          {isPaused && (
            <p className="text-center text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg py-2 px-3">
              ⏸ Timer is paused. Resume when you're back, or stop to save the logged time.
            </p>
          )}
        </div>
      ) : (
        {/* Existing start form — project, task, new task, start button */}
      )}
    </CardContent>
  </Card>
</div>
```

Right column (sidebar) — takes 5 of 12 columns on large screens:

```tsx
<div className="lg:col-span-5 space-y-4">
  <DailyGoalWidget totalSeconds={totalTodaySec} />
  <QuickActions
    onSelect={(pId, tId) => {
      setProjectId(pId);
      setTaskChoice(tId);
    }}
    currentProjectId={projectId}
    currentTaskId={taskChoice}
  />
</div>
```

---

#### 6.4 Keyboard shortcut for Pause (optional, Shift+Space)

Extend the existing `keydown` listener:

```diff
 const isSpaceBar = e.code === "Space" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
+const isPauseResume = e.code === "Space" && e.shiftKey && !e.ctrlKey && !e.metaKey;
 const isCtrlShiftT = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "t";

 if (isSpaceBar || isCtrlShiftT) {
   e.preventDefault();
   if (tracking) { void stopTimer(); }
   else if (canStart) { void startTimer(); }
 }
+if (isPauseResume && tracking) {
+  e.preventDefault();
+  if (isPaused) { void resumeTimer(); }
+  else { void pauseTimer(); }
+}
```

---

### MODULE 7: Admin Dashboard — Live Presence Feed Widget

**Files changed:** 1

---

#### 7.1 `apps/admin/src/features/dashboard/widgets/live-presence-widget.tsx`

The presence feed should visually differentiate paused members from active ones. Members with `isPaused: true` should show:

- An amber/orange dot instead of the green blinking dot
- An "On Break" badge instead of the project/task name
- Slightly reduced opacity or a horizontal rule separator

Relevant change in the member row render:

```tsx
<span
  className={`inline-block size-2 rounded-full ${
    m.isPaused ? "bg-amber-400" : "bg-emerald-500 animate-ping"
  }`}
/>;
{
  m.isPaused ? (
    <span className="text-amber-500 italic text-xs">On break</span>
  ) : (
    <span>
      Logged on: {m.projectName} / {m.taskName}
    </span>
  );
}
```

---

## Execution Order

The modules must be implemented in this strict dependency order to avoid type errors mid-build:

```
MODULE 1 (contracts/errors.ts)
MODULE 1 (contracts/timer.dto.ts)      ← depends on errors
MODULE 1 (contracts/routes.ts)
MODULE 2 (contracts/presence.dto.ts)
   ↓
MODULE 5 (client/timer.store.ts)       ← depends on updated ActiveTimerDto types
MODULE 3 (api/timer.service.ts)        ← depends on updated error codes
MODULE 3 (api/timer.controller.ts)     ← depends on updated service methods
MODULE 4 (api/presence.service.ts)     ← depends on updated TimerState shape
   ↓
MODULE 6 (client/timer-page.tsx)       ← depends on updated store + new routes
MODULE 7 (admin/live-presence-widget)  ← depends on updated PresenceMemberDto
```

---

## Verification Plan

### 1. Build check

```bash
npx pnpm --filter @kloqra/contracts build
npx pnpm typecheck
npx pnpm lint
```

### 2. Manual happy path

1. Open `http://localhost:3000/timer`
2. Select a project + task → click **Start timer** → verify clock ticks
3. Click **Pause break** → verify:
   - Clock freezes at current value
   - Ring turns amber
   - "Paused" label shows inside ring
   - "On Break" hint banner shows below buttons
4. Open admin `http://localhost:3002` → "Team Live" widget → verify member shows amber dot + "On break"
5. Click **Resume** → verify clock resumes from the frozen value (not zero)
6. Click **Stop & save** → verify a single `TimeLog` is created with `durationSec` = accumulated active time

### 3. Stop-while-paused path

1. Start timer → let it run 60 seconds
2. Pause → wait 30 seconds
3. Stop → verify `TimeLog.durationSec` ≈ 60 (not 90)

### 4. Cross-device / cross-session

1. Start timer on one browser tab
2. Open another tab / browser → navigate to timer
3. Verify paused state is reflected (via polling `/timer/active`)

---

## Out of Scope / Future Work

- **Multi-segment breakdown** — showing a breakdown of "5 segments of active work" is a potential future enhancement. The current plan produces a single clean TimeLog record which is simpler and consistent with the existing data model.
- **Pause reason tagging** — a future "break type" dropdown (Lunch / Standup / BRB) could be added to the pause action.
- **Timer persistence across browser close** — currently if the user closes the browser the timer keeps running on the server, unaffected. Pause state survives browser restarts because it lives in Redis.
- **Database-level pause log** — if auditing of breaks is ever required, a `TimerPauseLog` Prisma model could be added without changing the current plan's Redis architecture.
