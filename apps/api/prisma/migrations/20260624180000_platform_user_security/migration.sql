-- Platform user TOTP and password reset fields (parity with tenant User security)
ALTER TABLE "platform_users" ADD COLUMN "totp_secret" TEXT;
ALTER TABLE "platform_users" ADD COLUMN "totp_enabled_at" TIMESTAMP(3);
ALTER TABLE "platform_users" ADD COLUMN "password_reset_token_hash" TEXT;
ALTER TABLE "platform_users" ADD COLUMN "password_reset_expires_at" TIMESTAMP(3);
