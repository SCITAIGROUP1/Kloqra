# Implementation Plan: Recursive Time Entries

This plan details the implementation of a **Recursive / Repeating Time Entry** feature. Repetitive tasks (such as a Daily Scrum) can be logged in bulk for a date range without manually repeating the process for each day.

---

## Comprehensive Study & Research Gaps

To implement repeating time logs, we must address critical design constraints, business rules, and technical edge cases.

### 1. Future-Posting Prevention (The Core Rule)
> [!WARNING]
> **No Future Logging**: Allowing users to schedule/log recurring time entries in the future introduces significant business and database risks:
> - Destroys timesheet audit trails (users logging hours for meetings that haven't occurred).
> - Skews dashboards, velocity charts, and budget-burndown aggregates with "fake" hours.
>
> **The Solution**: 
> - Recurrence generation is strictly capped at **Today** (relative to the user's timezone).
> - Users can configure the recurrence start and end dates, but the end date is validated to be less than or equal to the current local date. Any portion of the requested range extending into the future is rejected or ignored.

### 2. Recurrence Model Comparison

We analyzed two primary strategies for recurring time logs:

| Feature | Strategy A: Retroactive Batch Generator (Recommended) | Strategy B: Cron Schedule Processor |
| :--- | :--- | :--- |
| **How it works** | The user sets up the pattern (e.g., Weekdays, 9:00 - 10:00) inside the log dialog. The backend immediately computes all matching dates from the start date up to Today, inserts the logs in a single batch, and returns a summary. | The user creates a "Recurrence Schedule Template" stored in the database. A background NestJS cron job runs periodically, checks what time slots have passed, and auto-inserts logs. |
| **Business Case Fit** | **High**: Business meetings (like Daily Scrum) frequently shift in length, get cancelled, or start late. Batch-creating them retroactively allows members to easily delete/adjust individual logs that differed. | **Low**: Auto-logging static meetings forces users to retroactively clean up/delete entries on days they were absent, out sick, or if the meeting time differed. |
| **Complexity** | **Low**: Requires no background jobs, no stateful schedule tracking, and fits cleanly into standard database transactions. | **High**: Requires new database tables, cron tasks, timezone shift mapping, and handling edge cases (e.g., if a user manually logs a task during that slot first). |

**Decision**: We choose **Strategy A (Retroactive Batch Generator)**. It meets the PM's requirement of preventing future logging, provides immediate feedback to the user, and supports the variable nature of daily scrums.

### 3. Handling Overlaps & Lock Periods
- **Overlaps**: If a user runs a batch generation over 10 days, but day 3 already has a conflicting time log, a strict validation check would fail the entire request.
  - *Solution*: The API will validate each generated slot. If a slot overlaps with an existing log, it is skipped. The API returns a list of successfully created logs and skipped dates.
- **Lock Periods**: If the user tries to repeat logs starting 2 weeks ago, but the first week's timesheet has already been submitted and locked, writes are forbidden.
  - *Solution*: Any slot falling inside a locked timesheet period is skipped, and the skipped reason is reported.

### 4. Timezone Shifts (DST Handling)
- When a user logs "09:00 to 10:00", we must translate that local time to UTC for each individual calendar day.
- We must use the user's current timezone setting (e.g., `America/New_York`) to calculate the start and end UTC timestamps for each date in the range, rather than using a static offset, to ensure correctness during daylight saving time transitions.

---

## Proposed Changes

We will introduce a batch creation API and integrate it with the manual time entry form.

### 1. Backend Contracts

#### [NEW] [batch-timelog.dto.ts](file:///Users/chamal/Desktop/ChronoMint/packages/contracts/src/dto/batch-timelog.dto.ts)
Create a validation schema for batch time logs:
```typescript
import { z } from "zod";
import { uuidSchema, isoDatetimeSchema } from "./common.dto";

export const createBatchTimeLogsSchema = z.object({
  taskId: uuidSchema,
  localStartTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:MM"),
  localEndTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:MM"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  recurrence: z.enum(["daily", "weekdays", "weekly"]),
  timezone: z.string(),
  description: z.string().max(2000).optional(),
  isBillable: z.boolean().optional()
});

export type CreateBatchTimeLogsDto = z.infer<typeof createBatchTimeLogsSchema>;
```

### 2. Backend API Service

#### [MODIFY] [timelogs.service.ts](file:///Users/chamal/Desktop/ChronoMint/apps/api/src/modules/timelogs/application/timelogs.service.ts)
Implement `createBatch` in `TimelogsService`:
- Validate that `endDate` $\le$ Today in the target timezone.
- Expand dates from `startDate` to `endDate` based on the recurrence rules:
  - `daily`: every day in the range.
  - `weekdays`: Monday through Friday.
  - `weekly`: every day matching the weekday of the `startDate`.
- For each day:
  - Calculate start and end times in the given timezone, convert to UTC `Date` objects.
  - Check lock periods (`timesheetLock.isPeriodEditable`).
  - Check overlaps (`assertNoOverlap` query).
  - If valid, create the `TimeLog` and audit event in a batch. If invalid/overlap/locked, skip the day and store the reason.
- Return a summary response detailing created IDs and skipped reasons for each date.

### 3. Frontend Time Entry Form

#### [MODIFY] [time-entry-dialog.tsx](file:///Users/chamal/Desktop/ChronoMint/apps/client/src/features/timesheet/time-entry-dialog.tsx)
- Add a "Repeat this entry" section inside the manual entry details tab (visible only when creating a new log).
- Add form controls:
  - **Repeat Type**: Radio group or dropdown (`None`, `Daily`, `Weekdays (Mon-Fri)`, `Weekly`).
  - **Repeat Until**: Date input, defaulting to Today and disabled for future dates.
- Bind these fields to the draft state.
- Update `onSave` logic: if recurrence is active, dispatch to the new batch creation endpoint `POST /timelogs/batch` instead of the single creation endpoint. Show a summary toast: *"Created X entries, skipped Y conflicts."*

---

## Verification Plan

### Automated Tests
- Unit tests in `timelogs.service.spec.ts` asserting:
  - Generating daily, weekdays, and weekly patterns.
  - Rejection of end dates in the future.
  - Correct timezone conversion.
  - Proper skip logic for overlapping slots and locked periods.
- E2E tests in `timelogs.e2e-spec.ts` verifying batch endpoint validation and response formats.

### Manual Verification
- Deploy to local environment.
- Log a "Daily Scrum" from last Monday to today. Verify that all weekday entries are populated.
- Log a recurring task that overlaps with an existing entry on one of the days, and verify that all other days succeed while the overlap day is reported as skipped.
