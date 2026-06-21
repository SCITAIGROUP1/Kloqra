import type { ProjectListItemDto, TaskDto } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { authedAgent, loginAs } from "./helpers/auth";
import { listItems } from "./helpers/pagination";

describe("Timesheets E2E", () => {
  let app: INestApplication;
  let memberSession: Awaited<ReturnType<typeof loginAs>>;
  let adminSession: Awaited<ReturnType<typeof loginAs>>;
  let approvalProjectId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    memberSession = await loginAs(app, "drew@kloqra.dev");
    adminSession = await loginAs(app, "admin@kloqra.dev");

    const workspacesRes = await authedAgent(app, memberSession).get("/workspaces");
    expect(workspacesRes.status).toBe(200);
    const acme = workspacesRes.body.find((w: { name?: string }) => w.name === "Acme Corporation");
    expect(acme?.id).toBeTruthy();
    memberSession = { ...memberSession, workspaceId: acme.id };
    adminSession = { ...adminSession, workspaceId: acme.id };

    const projectsRes = await authedAgent(app, memberSession).get("/projects");
    expect(projectsRes.status).toBe(200);
    const approvalProject = listItems<ProjectListItemDto>(projectsRes.body).find(
      (p) => p.name === "Support Retainer"
    );
    expect(approvalProject?.id).toBeTruthy();
    approvalProjectId = approvalProject!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /timesheets/submissions?scope=assigned returns periods with logged hours", async () => {
    const tasksRes = await authedAgent(app, memberSession)
      .get("/tasks")
      .query({ projectId: approvalProjectId });
    expect(tasksRes.status).toBe(200);
    const taskId = listItems<TaskDto>(tasksRes.body)[0]?.id;
    expect(taskId).toBeTruthy();

    const start = new Date("2036-03-10T10:00:00.000Z");
    const end = new Date("2036-03-10T11:00:00.000Z");

    const logRes = await authedAgent(app, memberSession).post("/timelogs").send({
      taskId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      description: "E2E submissions list"
    });
    expect(logRes.status).toBe(201);

    const res = await authedAgent(app, memberSession)
      .get("/timesheets/submissions")
      .query({ scope: "assigned", date: start.toISOString() });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(
      res.body.items.some((item: { projectId: string }) => item.projectId === approvalProjectId)
    ).toBe(true);
  });

  it("member submit → admin pending → approve", async () => {
    // Far-future weeks avoid seeded periods; retry on 403 when a prior run already approved that week.
    let submitRes: Awaited<ReturnType<ReturnType<typeof authedAgent>["post"]>> | undefined;
    for (let attempt = 0; attempt < 12; attempt++) {
      const salt = Date.now() + attempt * 7919;
      const year = 2100 + (salt % 50);
      const month = Math.floor(salt / 50) % 12;
      const day = 1 + (Math.floor(salt / 600) % 28);
      const date = new Date(Date.UTC(year, month, day, 12, 0, 0)).toISOString();

      submitRes = await authedAgent(app, memberSession).post("/timesheets/submit").send({
        projectId: approvalProjectId,
        date,
        note: "E2E submission"
      });
      if (submitRes.status !== 403) break;
    }
    expect(submitRes).toBeDefined();
    expect(submitRes!.status).toBe(201);
    expect(submitRes!.body.period.status).toBe("SUBMITTED");

    const pendingRes = await authedAgent(app, adminSession).get("/timesheets/pending");
    expect(pendingRes.status).toBe(200);
    const pending = pendingRes.body.items.find(
      (p: { projectId: string; userId: string }) =>
        p.projectId === approvalProjectId && p.userId === memberSession.userId
    );
    expect(pending?.id).toBeTruthy();

    const approveRes = await authedAgent(app, adminSession)
      .patch(`/timesheets/${pending.id}/approve`)
      .send({ reviewNote: "E2E approved" });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.ok).toBe(true);
  });
});
