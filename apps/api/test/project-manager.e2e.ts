import type { ProjectListItemDto, TaskDto } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { authedAgent, loginAs } from "./helpers/auth";
import { listItems } from "./helpers/pagination";

describe("Project lead E2E", () => {
  let app: INestApplication;
  let adminSession: Awaited<ReturnType<typeof loginAs>>;
  let leadSession: Awaited<ReturnType<typeof loginAs>>;
  let memberSession: Awaited<ReturnType<typeof loginAs>>;
  let otherMemberSession: Awaited<ReturnType<typeof loginAs>>;
  const leadEmail = "member@kloqra.dev";
  let ledProjectId: string;
  let otherProjectId: string;
  let secondLedProjectId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    adminSession = await loginAs(app, "admin@kloqra.dev");
    leadSession = await loginAs(app, leadEmail);
    memberSession = await loginAs(app, "drew@kloqra.dev");
    otherMemberSession = await loginAs(app, "alex@kloqra.dev");

    const workspacesRes = await authedAgent(app, adminSession).get("/workspaces");
    expect(workspacesRes.status).toBe(200);
    const acme = workspacesRes.body.find((w: { name?: string }) => w.name === "Acme Corporation");
    expect(acme?.id).toBeTruthy();
    const workspaceId = acme.id as string;
    adminSession = { ...adminSession, workspaceId };
    leadSession = { ...leadSession, workspaceId };
    memberSession = { ...memberSession, workspaceId };
    otherMemberSession = { ...otherMemberSession, workspaceId };

    const projectsRes = await authedAgent(app, adminSession).get("/projects");
    expect(projectsRes.status).toBe(200);
    const projects = listItems<ProjectListItemDto>(projectsRes.body);
    const ledProject = projects.find((p) => p.name === "Support Retainer");
    const otherProject = projects.find((p) => p.name === "Client Portal Redesign");
    expect(ledProject?.id).toBeTruthy();
    expect(otherProject?.id).toBeTruthy();
    ledProjectId = ledProject!.id;
    otherProjectId = otherProject!.id;

    const teamRes = await authedAgent(app, adminSession).get(`/projects/${ledProjectId}/team`);
    expect(teamRes.status).toBe(200);
    let leadMember = teamRes.body.members.find(
      (m: { userEmail?: string }) => m.userEmail === leadEmail
    );
    if (!leadMember) {
      const membersRes = await authedAgent(app, adminSession).get(
        `/workspaces/${workspaceId}/members`
      );
      const workspaceMember = membersRes.body.find(
        (m: { userEmail?: string }) => m.userEmail === leadEmail
      );
      expect(workspaceMember?.userId).toBeTruthy();
      const addRes = await authedAgent(app, adminSession)
        .post(`/projects/${ledProjectId}/team/members`)
        .send({ userId: workspaceMember.userId });
      expect(addRes.status).toBe(201);
      const refreshedTeam = await authedAgent(app, adminSession).get(
        `/projects/${ledProjectId}/team`
      );
      leadMember = refreshedTeam.body.members.find(
        (m: { userEmail?: string }) => m.userEmail === leadEmail
      );
    }
    expect(leadMember?.id).toBeTruthy();

    const roleRes = await authedAgent(app, adminSession)
      .patch(`/projects/${ledProjectId}/team/members/${leadMember.id}`)
      .send({ role: "PROJECT_MANAGER" });
    expect(roleRes.status).toBe(200);

    const secondLedRes = await authedAgent(app, adminSession)
      .post("/projects")
      .send({
        name: `Lead Scope B ${Date.now()}`,
        clientName: "Acme",
        budgetHours: 40,
        isBillable: true
      });
    expect(secondLedRes.status).toBe(201);
    secondLedProjectId = secondLedRes.body.id as string;

    const secondTeamRes = await authedAgent(app, adminSession).get(
      `/projects/${secondLedProjectId}/team`
    );
    let secondLeadMember = secondTeamRes.body.members.find(
      (m: { userEmail?: string }) => m.userEmail === leadEmail
    );
    if (!secondLeadMember) {
      const membersRes = await authedAgent(app, adminSession).get(
        `/workspaces/${workspaceId}/members`
      );
      const workspaceMember = membersRes.body.find(
        (m: { userEmail?: string }) => m.userEmail === leadEmail
      );
      const addRes = await authedAgent(app, adminSession)
        .post(`/projects/${secondLedProjectId}/team/members`)
        .send({ userId: workspaceMember.userId });
      expect(addRes.status).toBe(201);
      const refreshed = await authedAgent(app, adminSession).get(
        `/projects/${secondLedProjectId}/team`
      );
      secondLeadMember = refreshed.body.members.find(
        (m: { userEmail?: string }) => m.userEmail === leadEmail
      );
    }
    const secondRoleRes = await authedAgent(app, adminSession)
      .patch(`/projects/${secondLedProjectId}/team/members/${secondLeadMember.id}`)
      .send({ role: "PROJECT_MANAGER" });
    expect(secondRoleRes.status).toBe(200);

    const otherTeamRes = await authedAgent(app, adminSession).get(
      `/projects/${otherProjectId}/team`
    );
    const otherMember = otherTeamRes.body.members.find(
      (m: { userEmail?: string }) => m.userEmail === leadEmail
    );
    if (otherMember?.role === "PROJECT_MANAGER") {
      await authedAgent(app, adminSession)
        .patch(`/projects/${otherProjectId}/team/members/${otherMember.id}`)
        .send({ role: "MEMBER" });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /auth/me includes managedProjectIds for project lead MEMBER", async () => {
    const res = await authedAgent(app, leadSession).get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.workspaceRole).toBe("MEMBER");
    expect(res.body.managedProjectIds).toContain(ledProjectId);
    expect(res.body.managedProjectIds).toContain(secondLedProjectId);
    expect(res.body.managedProjectIds.length).toBeGreaterThanOrEqual(2);
    expect(res.body.managedProjectIds).not.toContain(otherProjectId);
  });

  it("project lead can create task on led project", async () => {
    const tasksRes = await authedAgent(app, adminSession).get("/tasks").query({
      projectId: ledProjectId,
      limit: 1
    });
    expect(tasksRes.status).toBe(200);
    const categoryId = listItems<TaskDto>(tasksRes.body)[0]?.categoryId;
    expect(categoryId).toBeTruthy();

    const res = await authedAgent(app, leadSession)
      .post("/tasks")
      .send({
        projectId: ledProjectId,
        categoryId,
        taskName: `Lead task ${Date.now()}`,
        billableDefault: true,
        isCommon: true
      });
    expect(res.status).toBe(201);
    expect(res.body.projectId).toBe(ledProjectId);
  });

  it("project lead cannot create task on non-led project", async () => {
    const tasksRes = await authedAgent(app, adminSession).get("/tasks").query({
      projectId: otherProjectId,
      limit: 1
    });
    const categoryId = listItems<TaskDto>(tasksRes.body)[0]?.categoryId;

    const res = await authedAgent(app, leadSession)
      .post("/tasks")
      .send({
        projectId: otherProjectId,
        categoryId,
        taskName: `Denied task ${Date.now()}`,
        billableDefault: true,
        isCommon: true
      });
    expect(res.status).toBe(403);
  });

  it("project lead approves led project timesheet", async () => {
    let submitRes: Awaited<ReturnType<ReturnType<typeof authedAgent>["post"]>> | undefined;
    for (let attempt = 0; attempt < 12; attempt++) {
      const salt = Date.now() + attempt * 7919;
      const year = 2100 + (salt % 50);
      const month = Math.floor(salt / 50) % 12;
      const day = 1 + (Math.floor(salt / 600) % 28);
      const date = new Date(Date.UTC(year, month, day, 12, 0, 0)).toISOString();

      submitRes = await authedAgent(app, memberSession).post("/timesheets/submit").send({
        projectId: ledProjectId,
        date,
        note: "Lead approve led"
      });
      if (submitRes.status !== 403) break;
    }
    expect(submitRes).toBeDefined();
    expect(submitRes!.status).toBe(201);
    const ledPeriodId = submitRes!.body.period.id as string;

    const approveLed = await authedAgent(app, leadSession)
      .patch(`/timesheets/${ledPeriodId}/approve`)
      .send({ reviewNote: "Lead approved" });
    expect(approveLed.status).toBe(200);
  });

  it("project lead cannot approve non-led project timesheet", async () => {
    let submitRes: Awaited<ReturnType<ReturnType<typeof authedAgent>["post"]>> | undefined;
    for (let attempt = 0; attempt < 12; attempt++) {
      const salt = Date.now() + attempt * 9973;
      const year = 2100 + (salt % 50);
      const month = Math.floor(salt / 50) % 12;
      const day = 1 + (Math.floor(salt / 600) % 28);
      const date = new Date(Date.UTC(year, month, day, 12, 0, 0)).toISOString();

      submitRes = await authedAgent(app, otherMemberSession).post("/timesheets/submit").send({
        projectId: otherProjectId,
        date,
        note: "Lead deny other"
      });
      if (submitRes.status !== 403) break;
    }
    expect(submitRes).toBeDefined();
    expect(submitRes!.status).toBe(201);
    const otherPeriodId = submitRes!.body.period.id as string;

    const approveOther = await authedAgent(app, leadSession)
      .patch(`/timesheets/${otherPeriodId}/approve`)
      .send({ reviewNote: "Should fail" });
    expect(approveOther.status).toBe(403);
  });
});
