import type { INestApplication } from "@nestjs/common";
import type { LoginSession } from "./auth";
import { authedAgent } from "./auth";

export type E2eProjectFixture = {
  projectId: string;
  categoryId: string;
  taskId: string;
  projectName: string;
};

type CreateE2eProjectOptions = {
  projectName?: string;
  clientName?: string;
  timesheetApprovalEnabled?: boolean;
  timesheetApprovalPeriod?: "weekly" | "daily" | "monthly";
  /** Workspace member user ids added to the project team (required for member-scoped APIs). */
  teamUserIds?: string[];
};

export async function createE2eProjectWithTask(
  app: INestApplication,
  adminSession: LoginSession,
  options: CreateE2eProjectOptions = {}
): Promise<E2eProjectFixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const projectName = options.projectName ?? `E2E Project ${suffix}`;

  const projectRes = await authedAgent(app, adminSession)
    .post("/projects")
    .send({
      name: projectName,
      clientName: options.clientName ?? "E2E Client",
      timesheetApprovalEnabled: options.timesheetApprovalEnabled ?? false,
      timesheetApprovalPeriod: options.timesheetApprovalPeriod ?? "weekly"
    });
  if (projectRes.status !== 201) {
    throw new Error(
      `Failed to create E2E project: ${projectRes.status} ${JSON.stringify(projectRes.body)}`
    );
  }

  const projectId = projectRes.body.id as string;

  for (const userId of options.teamUserIds ?? []) {
    const teamRes = await authedAgent(app, adminSession)
      .post(`/projects/${projectId}/team/members`)
      .send({ userId });
    if (teamRes.status !== 201) {
      throw new Error(
        `Failed to add team member ${userId}: ${teamRes.status} ${JSON.stringify(teamRes.body)}`
      );
    }
  }

  const categoryRes = await authedAgent(app, adminSession)
    .post("/categories")
    .send({ name: `E2E Category ${suffix}`, color: "#22c55e" });
  if (categoryRes.status !== 201) {
    throw new Error(
      `Failed to create E2E category: ${categoryRes.status} ${JSON.stringify(categoryRes.body)}`
    );
  }

  const categoryId = categoryRes.body.id as string;

  const taskRes = await authedAgent(app, adminSession)
    .post("/tasks")
    .send({
      projectId,
      categoryId,
      taskName: `E2E Task ${suffix}`,
      billableDefault: true,
      isCommon: true
    });
  if (taskRes.status !== 201) {
    throw new Error(`Failed to create E2E task: ${taskRes.status} ${JSON.stringify(taskRes.body)}`);
  }

  return {
    projectId,
    categoryId,
    taskId: taskRes.body.id as string,
    projectName
  };
}

export async function ensureUncategorizedCategory(
  app: INestApplication,
  adminSession: LoginSession
): Promise<string> {
  const listRes = await authedAgent(app, adminSession).get("/categories");
  if (listRes.status !== 200) {
    throw new Error(`Failed to list categories: ${listRes.status}`);
  }

  const existing = (listRes.body.items ?? listRes.body).find(
    (row: { name?: string }) => row.name === "Uncategorized"
  );
  if (existing?.id) return existing.id as string;

  const createRes = await authedAgent(app, adminSession)
    .post("/categories")
    .send({ name: "Uncategorized", color: "#94a3b8" });
  if (createRes.status !== 201) {
    throw new Error(
      `Failed to create Uncategorized category: ${createRes.status} ${JSON.stringify(createRes.body)}`
    );
  }

  return createRes.body.id as string;
}
