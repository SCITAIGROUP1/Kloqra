-- AlterTable
ALTER TABLE "categories" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "categories_workspace_id_is_active_idx" ON "categories"("workspace_id", "is_active");

-- CreateIndex
CREATE INDEX "tasks_project_id_is_active_idx" ON "tasks"("project_id", "is_active");
