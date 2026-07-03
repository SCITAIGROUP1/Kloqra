-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pending_phone" TEXT,
ADD COLUMN     "phone_verification_code_hash" TEXT,
ADD COLUMN     "phone_verification_expires_at" TIMESTAMP(3),
ADD COLUMN     "phone_verified_at" TIMESTAMP(3);
