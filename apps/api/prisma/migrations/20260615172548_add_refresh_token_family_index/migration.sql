-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_family_revoked_at_expires_at_idx" ON "refresh_tokens"("user_id", "family", "revoked_at", "expires_at");
