-- CreateEnum
CREATE TYPE "TimesheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AmendmentStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- Preserve existing status values when converting string columns to enums.
ALTER TABLE "timesheet_amendment_requests"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "AmendmentStatus" USING ("status"::text::"AmendmentStatus"),
  ALTER COLUMN "status" SET DEFAULT 'PENDING'::"AmendmentStatus",
  ALTER COLUMN "status" SET NOT NULL;

ALTER TABLE "timesheet_periods"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "TimesheetStatus" USING ("status"::text::"TimesheetStatus"),
  ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"TimesheetStatus",
  ALTER COLUMN "status" SET NOT NULL;

-- Status indexes already exist from prior migrations.
