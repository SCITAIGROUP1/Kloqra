# Database Table Partitioning Architecture

This document describes the design, implementation, and operational runbook for PostgreSQL table range partitioning in ChronoMint.

---

## 1. Why Partitioning?

As user activity scales, the `time_logs` and `time_log_audit_events` tables grow linearly. Large unpartitioned tables experience performance degradation due to:

- **Index Bloat**: Indexes grow too large to fit entirely in database RAM, forcing slower disk I/O paging.
- **Full Table Scans**: Queries without highly selective indexes scan millions of rows.
- **Delete Overhead**: Compliance-based data pruning (e.g., removing logs older than 7 years) requires massive `DELETE` transactions that lock tables and fragment disk storage.

### The Solution: Range Partitioning

We partition:

1. **`time_logs`**: Partitioned **monthly** by `start_time`.
2. **`time_log_audit_events`**: Partitioned **yearly** by `created_at`.

### Benefits

- **Partition Pruning**: PostgreSQL query planner instantly excludes partitions outside the query range (e.g., pulling a weekly timesheet for June 2026 only scans the June 2026 partition table).
- **RAM Footprint Optimization**: The database only needs to keep the active month's/year's partition indexes in memory.
- **Instant Pruning (Drop Partition)**: To purge old data, we can run `DROP TABLE` on an entire monthly partition. This is an instantaneous `O(1)` operational command with zero write lock contention or index fragmentation.

---

## 2. How is it Implemented?

### Schema Design & Primary Key Constraint

PostgreSQL requires that any unique or primary key constraint on a partitioned table must include the partition key columns. Therefore:

- `TimeLog` primary key is compound: `(id, start_time)`.
- `TimeLogAuditEvent` primary key is compound: `(id, created_at)`.

No other tables reference these tables as foreign keys, which allowed us to change the primary keys without updating foreign key relations elsewhere in the system.

### Zero-Lookup Cursor Pagination

We replaced the database fallback lookups for pagination with a stateless compound cursor format:

1. **API Schema**: [timelog.dto.ts](../../packages/contracts/src/dto/timelog.dto.ts) permits any string format for `cursor` and `nextCursor`.
2. **Serialization**: The API returns `nextCursor` as `id:startTime` (e.g., `550e8400-e29b-41d4-a716-446655440003:2026-06-02T09:00:00.000Z`).
3. **Deserialization**: On subsequent paginated requests, the API parses `id` and `startTime` directly from the cursor string, injecting it into Prisma's cursor query filter. This avoids any fallback database lookup.

### Transactional SQL Migration

The database migrations are defined in [migration.sql](../../apps/api/prisma/migrations/20260619191954_partition_time_logs_and_audit/migration.sql):

1. **Clean Recreate**: Drops the existing tables and creates partitioned parent tables.
2. **Partitions Creation**: Attaches partition tables for each month of 2026 and year 2025/2026.
3. **Constraints & Indexes**: Adds check constraints (`time_log_source_check`), foreign keys, and indexes (e.g., `time_logs_user_id_start_time_idx`) to the parent partitioned tables, which are inherited by all child partitions.

---

## 3. When to Add New Partitions?

PostgreSQL does not create future partitions automatically. If a write is attempted for a time period without an attached partition, the database write fails.

### Current Coverage

- `time_logs`: Covers all months from January 1, 2025, to January 1, 2027.
- `time_log_audit_events`: Covers years 2025 and 2026.

### Operational Runbook: Adding Future Partitions

At least one month before a new year starts, operational scripts or database migrations must create and attach new partitions.

#### SQL for `time_logs` (2027)

```sql
CREATE TABLE "time_logs_y2027m01" PARTITION OF "time_logs" FOR VALUES FROM ('2027-01-01 00:00:00') TO ('2027-02-01 00:00:00');
CREATE TABLE "time_logs_y2027m02" PARTITION OF "time_logs" FOR VALUES FROM ('2027-02-01 00:00:00') TO ('2027-03-01 00:00:00');
CREATE TABLE "time_logs_y2027m03" PARTITION OF "time_logs" FOR VALUES FROM ('2027-03-01 00:00:00') TO ('2027-04-01 00:00:00');
CREATE TABLE "time_logs_y2027m04" PARTITION OF "time_logs" FOR VALUES FROM ('2027-04-01 00:00:00') TO ('2027-05-01 00:00:00');
CREATE TABLE "time_logs_y2027m05" PARTITION OF "time_logs" FOR VALUES FROM ('2027-05-01 00:00:00') TO ('2027-06-01 00:00:00');
CREATE TABLE "time_logs_y2027m06" PARTITION OF "time_logs" FOR VALUES FROM ('2027-06-01 00:00:00') TO ('2027-07-01 00:00:00');
CREATE TABLE "time_logs_y2027m07" PARTITION OF "time_logs" FOR VALUES FROM ('2027-07-01 00:00:00') TO ('2027-08-01 00:00:00');
CREATE TABLE "time_logs_y2027m08" PARTITION OF "time_logs" FOR VALUES FROM ('2027-08-01 00:00:00') TO ('2027-09-01 00:00:00');
CREATE TABLE "time_logs_y2027m09" PARTITION OF "time_logs" FOR VALUES FROM ('2027-09-01 00:00:00') TO ('2027-10-01 00:00:00');
CREATE TABLE "time_logs_y2027m10" PARTITION OF "time_logs" FOR VALUES FROM ('2027-10-01 00:00:00') TO ('2027-11-01 00:00:00');
CREATE TABLE "time_logs_y2027m11" PARTITION OF "time_logs" FOR VALUES FROM ('2027-11-01 00:00:00') TO ('2027-12-01 00:00:00');
CREATE TABLE "time_logs_y2027m12" PARTITION OF "time_logs" FOR VALUES FROM ('2027-12-01 00:00:00') TO ('2028-01-01 00:00:00');
```

#### SQL for `time_log_audit_events` (2027)

```sql
CREATE TABLE "time_log_audit_events_y2027" PARTITION OF "time_log_audit_events" FOR VALUES FROM ('2027-01-01 00:00:00') TO ('2028-01-01 00:00:00');
```
