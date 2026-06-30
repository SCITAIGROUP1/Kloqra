-- Remove duplicate projects (keep oldest per workspace + name), then enforce uniqueness.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY workspace_id, name
      ORDER BY created_at ASC
    ) AS rn
  FROM projects
),
dupes AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM projects WHERE id IN (SELECT id FROM dupes);

CREATE UNIQUE INDEX "projects_workspace_id_name_key" ON "projects"("workspace_id", "name");
