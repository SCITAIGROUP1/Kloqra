-- Enforce tenant ownership on workspaces (run SaaS-F21 backfill before this migration).
ALTER TABLE "workspaces" ALTER COLUMN "tenant_id" SET NOT NULL;
