import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { authedAgent, loginAs } from "./helpers/auth";

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
    const acme = workspacesRes.body.find((w: { slug?: string }) => w.slug === "acme");
    expect(acme?.id).toBeTruthy();
    memberSession = { ...memberSession, workspaceId: acme.id };
    adminSession = { ...adminSession, workspaceId: acme.id };

    const projectsRes = await authedAgent(app, memberSession).get("/projects");
    expect(projectsRes.status).toBe(200);
    const approvalProject = projectsRes.body.find(
      (p: { timesheetApprovalEnabled?: boolean }) => p.timesheetApprovalEnabled
    );
    expect(approvalProject?.id).toBeTruthy();
    approvalProjectId = approvalProject.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /timesheets/submissions?scope=assigned returns approval-enabled projects", async () => {
    const res = await authedAgent(app, memberSession)
      .get("/timesheets/submissions")
      .query({ scope: "assigned" });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(
      res.body.items.some((item: { projectId: string }) => item.projectId === approvalProjectId)
    ).toBe(true);
  });

  it("member submit → admin pending → approve", async () => {
    const date = new Date().toISOString();

    const submitRes = await authedAgent(app, memberSession)
      .post("/timesheets/submit")
      .send({ projectId: approvalProjectId, date, note: "E2E submission" });
    expect(submitRes.status).toBe(201);
    expect(submitRes.body.status).toBe("SUBMITTED");

    const pendingRes = await authedAgent(app, adminSession).get("/timesheets/pending");
    expect(pendingRes.status).toBe(200);
    const pending = pendingRes.body.find(
      (p: { projectId: string; userId: string }) =>
        p.projectId === approvalProjectId && p.userId === memberSession.userId
    );
    expect(pending?.id).toBeTruthy();

    const approveRes = await authedAgent(app, adminSession)
      .patch(`/timesheets/${pending.id}/approve`)
      .send({ reviewNote: "E2E approved" });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe("APPROVED");
  });
});
