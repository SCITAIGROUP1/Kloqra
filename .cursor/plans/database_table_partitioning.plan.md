---
name: Database Table Partitioning Plan
overview: Implement PostgreSQL range partitioning on the high-volume TimeLog and TimeLogAuditEvent tables to optimize date-filtered query index performance, reduce RAM index footprint, and facilitate instant compliance-based data purges.
todos:
  - id: prisma-schema-update
    content: Update schema.prisma to use compound primary keys including start_time/created_at
    status: queued
  - id: app-query-refactor
    content: Update TimelogsService update/delete queries to filter by compound id_startTime keys
    status: queued
  - id: custom-sql-migration
    content: Generate empty Prisma migration and populate custom transactional SQL for range partitioning
    status: queued
  - id: verify-compile-tests
    content: Run typescript checks and vitest suites to confirm zero regressions
    status: queued
isProject: false
---

# Database Table Partitioning Plan

## Problem Statement

As user activity increases over time, the `TimeLog` and `TimeLogAuditEvent` tables grow linearly. Large unpartitioned tables suffer from index bloat, forcing the database to page indexes in and out of RAM, which degrades query performance. 

Most queries on these tables (timesheets, calendar UI, reports, and exports) are filtered by narrow date ranges. PostgreSQL table partitioning allows the database to ignore irrelevant partitions entirely (partition pruning) and keeps active indexes small enough to fit completely in memory.

## Architectural Trade-offs

We will implement **PostgreSQL Range Partitioning**:
- `TimeLog`: Partitioned by range on `start_time` (monthly partitions).
- `TimeLogAuditEvent`: Partitioned by range on `created_at` (yearly partitions).

### PostgreSQL Constraints
1. **Primary Key Requirement**: PostgreSQL requires that any unique or primary key constraint on a partitioned table must include the partition key columns. Therefore:
   - `TimeLog` primary key must be compound: `(id, start_time)`.
   - `TimeLogAuditEvent` primary key must be compound: `(id, created_at)`.
2. **Foreign Key Limitations**: Other tables cannot reference a partitioned table unless they reference the *full* compound primary key (including the partition column).
   - *Parity Check*: Fortunately, no other tables in the ChronoMint schema declare foreign keys pointing *to* `TimeLog` or `TimeLogAuditEvent`. They only declare outbound relations pointing *from* `TimeLog` to `User` and `Task`. This enables partitioning without breaking any other tables' relations.
3. **Partition Miss Safety Net**: If a monthly partition is not pre-created and a user tries to log time for that period, standard range partitioning will fail the insert.
   - *Mitigation*: We will define a `DEFAULT` partition for both tables. If a month or year does not have a dedicated partition, PostgreSQL will route the records to the default partition, guaranteeing that inserts never fail in production.

---

## Proposed Changes

### Phase 1 — Prisma Schema Updates

We will modify [schema.prisma](../../apps/api/prisma/schema.prisma) to change the primary keys of both models:

```prisma
model TimeLog {
  // before: id String @id @default(uuid())
  id          String   @default(uuid())
  userId      String   @map("user_id")
  taskId      String   @map("task_id")
  startTime   DateTime @map("start_time")
  // ...
  
  @@id([id, startTime]) // compound primary key
  @@index([userId, startTime])
  @@index([taskId, startTime])
}

model TimeLogAuditEvent {
  // before: id String @id @default(uuid())
  id          String   @default(uuid())
  workspaceId String   @map("workspace_id")
  // ...
  createdAt   DateTime @default(now()) @map("created_at")
  
  @@id([id, createdAt]) // compound primary key
}
```

### Phase 2 — Refactoring Application Queries

Because `id` is no longer a single unique constraint under the new schema, Prisma operations requiring unique filters (like `.update` and `.delete`) must be updated to use the compound `id_startTime` parameter.

In [timelogs.service.ts](../../apps/api/src/modules/timelogs/application/timelogs.service.ts):

- **Update**:
  ```ts
  // Before:
  const row = await tx.timeLog.update({
    where: { id },
    data: { ... }
  });
  // After:
  const row = await tx.timeLog.update({
    where: { id_startTime: { id, startTime: log.startTime } },
    data: { ... }
  });
  ```
- **Delete**:
  ```ts
  // Before:
  await tx.timeLog.delete({ where: { id } });
  // After:
  await tx.timeLog.delete({ where: { id_startTime: { id, startTime: log.startTime } } });
  ```

*Note: The original log is already fetched via `findFirst` at the start of both functions, making `log.startTime` fully available.*

### Phase 3 — Database Migration Script

We will generate an empty migration folder using `prisma migrate dev --create-only` and write a custom transactional SQL migration script:

```sql
-- 1. Rename existing tables
ALTER TABLE "time_logs" RENAME TO "time_logs_old";
ALTER TABLE "time_log_audit_events" RENAME TO "time_log_audit_events_old";

-- 2. Create partitioned tables
CREATE TABLE "time_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "duration_sec" INTEGER NOT NULL,
    "description" TEXT,
    "is_billable" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "time_logs_pkey" PRIMARY KEY ("id", "start_time")
) PARTITION BY RANGE ("start_time");

CREATE TABLE "time_log_audit_events" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "time_log_id" TEXT NOT NULL,
    "entry_user_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "time_log_audit_events_pkey" PRIMARY KEY ("id", "created_at")
) PARTITION BY RANGE ("created_at");

-- 3. Create partitions for 2025/2026
CREATE TABLE "time_logs_y2025" PARTITION OF "time_logs"
  FOR VALUES FROM ('2025-01-01 00:00:00') TO ('2026-01-01 00:00:00');

CREATE TABLE "time_logs_y2026m01" PARTITION OF "time_logs" FOR VALUES FROM ('2026-01-01 00:00:00') TO ('2026-02-01 00:00:00');
CREATE TABLE "time_logs_y2026m02" PARTITION OF "time_logs" FOR VALUES FROM ('2026-02-01 00:00:00') TO ('2026-03-01 00:00:00');
CREATE TABLE "time_logs_y2026m03" PARTITION OF "time_logs" FOR VALUES FROM ('2026-03-01 00:00:00') TO ('2026-04-01 00:00:00');
CREATE TABLE "time_logs_y2026m04" PARTITION OF "time_logs" FOR VALUES FROM ('2026-04-01 00:00:00') TO ('2026-05-01 00:00:00');
CREATE TABLE "time_logs_y2026m05" PARTITION OF "time_logs" FOR VALUES FROM ('2026-05-01 00:00:00') TO ('2026-06-01 00:00:00');
CREATE TABLE "time_logs_y2026m06" PARTITION OF "time_logs" FOR VALUES FROM ('2026-06-01 00:00:00') TO ('2026-07-01 00:00:00');
CREATE TABLE "time_logs_y2026m07" PARTITION OF "time_logs" FOR VALUES FROM ('2026-06-01 00:00:00') TO ('2026-08-01 00:00:00');
CREATE TABLE "time_logs_y2026m08" PARTITION OF "time_logs" FOR VALUES FROM ('2026-08-01 00:00:00') TO ('2026-09-01 00:00:00');
CREATE TABLE "time_logs_y2026m09" PARTITION OF "time_logs" FOR VALUES FROM ('2026-09-01 00:00:00') TO ('2026-10-01 00:00:00');
CREATE TABLE "time_logs_y2026m10" PARTITION OF "time_logs" FOR VALUES FROM ('2026-10-01 00:00:00') TO ('2026-11-01 00:00:00');
CREATE TABLE "time_logs_y2026m11" PARTITION OF "time_logs" FOR VALUES FROM ('2026-11-01 00:00:00') TO ('2026-12-01 00:00:00');
CREATE TABLE "time_logs_y2026m12" PARTITION OF "time_logs" FOR VALUES FROM ('2026-12-01 00:00:00') TO ('2027-01-01 00:00:00');

CREATE TABLE "time_log_audit_events_y2025" PARTITION OF "time_log_audit_events"
  FOR VALUES FROM ('2025-01-01 00:00:00') TO ('2026-01-01 00:00:00');
CREATE TABLE "time_log_audit_events_y2026" PARTITION OF "time_log_audit_events"
  FOR VALUES FROM ('2026-01-01 00:00:00') TO ('2027-01-01 00:00:00');

-- 4. Create default fallback partitions (safety net)
CREATE TABLE "time_logs_default" PARTITION OF "time_logs" DEFAULT;
CREATE TABLE "time_log_audit_events_default" PARTITION OF "time_log_audit_events" DEFAULT;

-- 5. Copy historical data into partitioned tables
INSERT INTO "time_logs" SELECT * FROM "time_logs_old";
INSERT INTO "time_log_audit_events" SELECT * FROM "time_log_audit_events_old";

-- 6. Drop old tables
DROP TABLE "time_logs_old";
DROP TABLE "time_log_audit_events_old";

-- 7. Add foreign keys
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. Add indexes
CREATE INDEX "time_logs_user_id_start_time_idx" ON "time_logs"("user_id", "start_time");
CREATE INDEX "time_logs_task_id_start_time_idx" ON "time_logs"("task_id", "start_time");

CREATE INDEX "time_log_audit_events_time_log_id_created_at_idx" ON "time_log_audit_events"("time_log_id", "created_at");
CREATE INDEX "time_log_audit_events_workspace_id_created_at_idx" ON "time_log_audit_events"("workspace_id", "created_at");
CREATE INDEX "time_log_audit_events_workspace_id_entry_user_id_created_at_idx" ON "time_log_audit_events"("workspace_id", "entry_user_id", "created_at" DESC);
