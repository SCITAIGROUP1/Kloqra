-- AlterTable
ALTER TABLE "users" ADD COLUMN "first_name" TEXT,
ADD COLUMN "last_name" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "location" TEXT,
ADD COLUMN "avatar_url" TEXT,
ADD COLUMN "job_title" TEXT,
ADD COLUMN "department" TEXT,
ADD COLUMN "work_start_date" DATE,
ADD COLUMN "totp_secret" TEXT,
ADD COLUMN "totp_enabled_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN "user_agent" TEXT,
ADD COLUMN "ip_address" TEXT,
ADD COLUMN "last_used_at" TIMESTAMP(3);

-- Backfill first_name / last_name from name
UPDATE "users"
SET
  "first_name" = CASE
    WHEN position(' ' in trim("name")) > 0 THEN split_part(trim("name"), ' ', 1)
    ELSE trim("name")
  END,
  "last_name" = CASE
    WHEN position(' ' in trim("name")) > 0 THEN trim(substring(trim("name") from position(' ' in trim("name")) + 1))
    ELSE ''
  END
WHERE "first_name" IS NULL;
