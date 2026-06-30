import { ROUTES, type TeamActivitiesDto, type TeamMembersOverviewDto } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { authedAgent, loginAs } from "./helpers/auth";

describe("Workspace E2E", () => {
  let app: INestApplication;
  let adminSession: Awaited<ReturnType<typeof loginAs>>;
  let memberSession: Awaited<ReturnType<typeof loginAs>>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    adminSession = await loginAs(app, "admin@kloqra.dev");
    memberSession = await loginAs(app, "member@kloqra.dev");
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /workspaces/:id/members/overview returns paginated team overview for admin", async () => {
    const path = `${ROUTES.WORKSPACES.MEMBERS_OVERVIEW(adminSession.workspaceId)}?page=1&limit=20`;
    const res = await authedAgent(app, adminSession).get(path);
    expect(res.status).toBe(200);

    const body = res.body as TeamMembersOverviewDto;
    expect(Array.isArray(body.members)).toBe(true);
    expect(body.members.length).toBeGreaterThan(0);
    expect(body.summary.totalMembers).toBeGreaterThan(0);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
    expect(typeof body.total).toBe("number");
    expect(typeof body.totalPages).toBe("number");
  });

  it("member cannot GET /workspaces/:id/members/overview", async () => {
    const path = `${ROUTES.WORKSPACES.MEMBERS_OVERVIEW(memberSession.workspaceId)}?page=1&limit=20`;
    const res = await authedAgent(app, memberSession).get(path);
    expect(res.status).toBe(403);
  });

  it("GET /workspaces/:id/team-activities returns team activity rows for member", async () => {
    const path = ROUTES.WORKSPACES.TEAM_ACTIVITIES(memberSession.workspaceId);
    const res = await authedAgent(app, memberSession).get(path);
    expect(res.status).toBe(200);

    const body = res.body as TeamActivitiesDto;
    expect(body.periodStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.periodEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Array.isArray(body.members)).toBe(true);
    expect(body.members.length).toBeGreaterThan(0);
    expect(body.members[0]).toMatchObject({
      userId: expect.any(String),
      userName: expect.any(String),
      periodTotalHours: expect.any(Number),
      dailyHours: expect.any(Array)
    });
  });

  it("GET /workspaces/:id/team-activities returns team activity rows for admin", async () => {
    const path = ROUTES.WORKSPACES.TEAM_ACTIVITIES(adminSession.workspaceId);
    const res = await authedAgent(app, adminSession).get(path);
    expect(res.status).toBe(200);
    expect((res.body as TeamActivitiesDto).members.length).toBeGreaterThan(0);
  });

  it("POST /workspaces rejects duplicate workspace names", async () => {
    const res = await authedAgent(app, adminSession)
      .post(ROUTES.WORKSPACES.CREATE)
      .send({ name: "Acme Corporation" });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("A workspace with this name already exists.");
  });

  it("POST /workspaces rejects duplicate workspace names case-insensitively", async () => {
    const res = await authedAgent(app, adminSession)
      .post(ROUTES.WORKSPACES.CREATE)
      .send({ name: "acme corporation" });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("A workspace with this name already exists.");
  });

  it("deactivates TeamMember rows when workspace member is removed", async () => {
    const prisma = app.get(PrismaService);
    const workspaceId = adminSession.workspaceId;

    await prisma.user.deleteMany({ where: { email: "temp-cascade@kloqra.dev" } });

    // Create a new temp user and membership
    const user = await prisma.user.create({
      data: {
        email: "temp-cascade@kloqra.dev",
        name: "Temp Cascade",
        passwordHash: "hash"
      }
    });

    const wsMember = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role: "MEMBER"
      }
    });

    // Assign to a project/team in this workspace
    const project = await prisma.project.findFirst({ where: { workspaceId } });
    expect(project).toBeDefined();

    const team =
      (await prisma.team.findFirst({ where: { projectId: project!.id } })) ??
      (await prisma.team.create({ data: { projectId: project!.id } }));

    const teamMember = await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: user.id,
        isActive: true
      }
    });

    // Remove the member via API
    const removePath = ROUTES.WORKSPACES.MEMBER(workspaceId, wsMember.id);
    const res = await authedAgent(app, adminSession).del(removePath);
    expect(res.status).toBe(200);

    // Assert workspace member is deleted
    const deletedWsMember = await prisma.workspaceMember.findUnique({ where: { id: wsMember.id } });
    expect(deletedWsMember).toBeNull();

    // Assert TeamMember is deactivated (isActive = false)
    const updatedTeamMember = await prisma.teamMember.findUnique({ where: { id: teamMember.id } });
    expect(updatedTeamMember?.isActive).toBe(false);

    // Cleanup
    await prisma.teamMember.delete({ where: { id: teamMember.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  it("concurrency: blocks demoting the last admin when two demotions are requested simultaneously", async () => {
    const prisma = app.get(PrismaService);
    const workspaceId = adminSession.workspaceId;

    await prisma.user.deleteMany({ where: { email: "second-admin@kloqra.dev" } });

    // Find and temporarily demote other admins so we have exactly two admins
    const admins = await prisma.workspaceMember.findMany({
      where: { workspaceId, role: "ADMIN" }
    });
    const otherAdmins = admins.filter((a) => a.userId !== adminSession.userId);
    for (const a of otherAdmins) {
      await prisma.workspaceMember.update({
        where: { id: a.id },
        data: { role: "MEMBER" }
      });
    }

    // Create a new admin in this workspace, so we have exactly two admins (Avery Admin + Second Admin)
    const newAdmin = await prisma.user.create({
      data: {
        email: "second-admin@kloqra.dev",
        name: "Second Admin",
        passwordHash: "hash"
      }
    });

    const newAdminMember = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: newAdmin.id,
        role: "ADMIN"
      }
    });

    // Obtain current admin (Avery Admin) workspace member
    const firstAdminMember = await prisma.workspaceMember.findFirstOrThrow({
      where: { workspaceId, userId: adminSession.userId }
    });

    // We have exactly two admins. Demote both concurrently.
    const path1 = ROUTES.WORKSPACES.MEMBER(workspaceId, firstAdminMember.id);
    const path2 = ROUTES.WORKSPACES.MEMBER(workspaceId, newAdminMember.id);

    const [res1, res2] = await Promise.all([
      authedAgent(app, adminSession).patch(path1).send({ role: "MEMBER" }),
      authedAgent(app, adminSession).patch(path2).send({ role: "MEMBER" })
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(403);

    // Clean up second admin
    await prisma.workspaceMember.delete({ where: { id: newAdminMember.id } });
    await prisma.user.delete({ where: { id: newAdmin.id } });

    // Restore first admin to ADMIN if she was demoted
    await prisma.workspaceMember.update({
      where: { id: firstAdminMember.id },
      data: { role: "ADMIN" }
    });

    // Restore other admins
    for (const a of otherAdmins) {
      await prisma.workspaceMember.update({
        where: { id: a.id },
        data: { role: "ADMIN" }
      });
    }
  });
});
