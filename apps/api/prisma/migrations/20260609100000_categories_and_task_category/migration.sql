-- Categories table: workspace-scoped category that groups tasks.
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categories_workspace_id_name_key" ON "categories"("workspace_id", "name");
CREATE INDEX "categories_workspace_id_idx" ON "categories"("workspace_id");

ALTER TABLE "categories"
    ADD CONSTRAINT "categories_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Tasks: add nullable category_id first so we can backfill before enforcing NOT NULL.
ALTER TABLE "tasks" ADD COLUMN "category_id" TEXT;

-- Backfill: one "Uncategorized" category per workspace, then assign every existing task.
INSERT INTO "categories" ("id", "workspace_id", "name", "description", "created_at", "updated_at")
SELECT gen_random_uuid()::text,
       w."id",
       'Uncategorized',
       'Auto-created during category restructure',
       NOW(),
       NOW()
FROM "workspaces" w
ON CONFLICT ("workspace_id", "name") DO NOTHING;

UPDATE "tasks" t
SET "category_id" = c."id"
FROM "projects" p
JOIN "categories" c ON c."workspace_id" = p."workspace_id" AND c."name" = 'Uncategorized'
WHERE t."project_id" = p."id"
  AND t."category_id" IS NULL;

-- Now enforce NOT NULL and add the FK + index.
ALTER TABLE "tasks" ALTER COLUMN "category_id" SET NOT NULL;

CREATE INDEX "tasks_category_id_idx" ON "tasks"("category_id");

ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
