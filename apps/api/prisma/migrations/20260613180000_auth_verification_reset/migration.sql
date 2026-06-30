-- AlterTable
ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP(3),
ADD COLUMN "email_verification_token_hash" TEXT,
ADD COLUMN "email_verification_expires_at" TIMESTAMP(3),
ADD COLUMN "password_reset_token_hash" TEXT,
ADD COLUMN "password_reset_expires_at" TIMESTAMP(3);

-- Backfill: existing users are treated as verified
UPDATE "users" SET "email_verified_at" = NOW() WHERE "email_verified_at" IS NULL;
