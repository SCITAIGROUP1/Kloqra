/*
  Warnings:

  - A unique constraint covering the columns `[workspace_id,user_id,project_id,effective_from]` on the table `hourly_rates` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "hourly_rates_workspace_id_user_id_project_id_effective_from_key" ON "hourly_rates"("workspace_id", "user_id", "project_id", "effective_from");
