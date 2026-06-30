-- Workspace → Project → Team → TeamMember

CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "teams_project_id_key" ON "teams"("project_id");

CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");

-- One team per project
INSERT INTO "teams" ("id", "project_id", "created_at")
SELECT gen_random_uuid()::text, "id", NOW() FROM "projects";

-- Migrate project_members → team_members
INSERT INTO "team_members" ("id", "team_id", "user_id", "created_at")
SELECT pm."id", t."id", pm."user_id", pm."created_at"
FROM "project_members" pm
JOIN "teams" t ON t."project_id" = pm."project_id"
ON CONFLICT ("team_id", "user_id") DO NOTHING;

ALTER TABLE "teams" ADD CONSTRAINT "teams_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "project_members";
