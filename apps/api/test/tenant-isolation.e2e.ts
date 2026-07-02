import { ROUTES } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { authedAgent, loginAs } from "./helpers/auth";
import { setTenantLimitsOverride } from "./helpers/plan-limits";
import {
  cleanupTenantIsolationFixtures,
  createIsolatedAcmeMemberFixture,
  createTenantBFixture,
  type TenantBFixture
} from "./helpers/tenant-isolation-fixture";

describe("Tenant isolation E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantB: TenantBFixture;
  let demoTenantId: string;
  let meridianWorkspaceId: string;
  let tenantASession: Awaited<ReturnType<typeof loginAs>>;
  let tenantBOwnerSession: Awaited<ReturnType<typeof loginAs>>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    await cleanupTenantIsolationFixtures(prisma);
    tenantB = await createTenantBFixture(prisma);

    tenantASession = await loginAs(app, "member@kloqra.dev");
    tenantBOwnerSession = await loginAs(app, "owner-b@kloqra.dev");
    demoTenantId = tenantASession.tenantId;

    const meridian = await prisma.workspace.findUniqueOrThrow({
      where: { slug: "meridian" },
      select: { id: true }
    });
    meridianWorkspaceId = meridian.id;

    await setTenantLimitsOverride(prisma, demoTenantId, { maxReportingApiKeys: 100 });
  });

  afterAll(async () => {
    await setTenantLimitsOverride(prisma, demoTenantId, null);
    await cleanupTenantIsolationFixtures(prisma);
    await app.close();
  });

  it("rejects cross-tenant workspace switch", async () => {
    const res = await authedAgent(app, tenantASession)
      .post(ROUTES.AUTH.SWITCH_WORKSPACE)
      .send({ workspaceId: tenantB.workspaceId });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });

  it("lists only demo tenant workspaces for tenant A member", async () => {
    const res = await authedAgent(app, tenantASession).get(ROUTES.WORKSPACES.LIST);
    expect(res.status).toBe(200);

    const workspaces = await prisma.workspace.findMany({
      where: { id: { in: (res.body as Array<{ id: string }>).map((w) => w.id) } },
      select: { slug: true }
    });
    expect(workspaces.map((w) => w.slug).sort()).toEqual(["acme", "meridian"]);
    expect(tenantASession.tenantId).toBe(demoTenantId);
    expect(workspaces.some((w) => w.slug === "isolation-ws-b")).toBe(false);
  });

  it("lists only tenant B workspace for tenant B owner", async () => {
    const res = await authedAgent(app, tenantBOwnerSession).get(ROUTES.WORKSPACES.LIST);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(tenantB.workspaceId);

    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: res.body[0].id },
      select: { slug: true }
    });
    expect(workspace.slug).toBe("isolation-ws-b");
    expect(tenantBOwnerSession.tenantId).toBe(tenantB.tenantId);
  });

  it("rejects tenant A admin reading tenant B project by id", async () => {
    const adminSession = await loginAs(app, "admin@kloqra.dev");
    const res = await authedAgent(app, adminSession).get(ROUTES.PROJECTS.BY_ID(tenantB.projectId));
    expect([403, 404]).toContain(res.status);
  });

  it("rejects tenant A admin mutating tenant B category by id", async () => {
    const adminSession = await loginAs(app, "admin@kloqra.dev");
    const res = await authedAgent(app, adminSession)
      .patch(ROUTES.CATEGORIES.BY_ID(tenantB.categoryId))
      .send({ name: "IDOR probe" });
    expect([403, 404]).toContain(res.status);
  });

  it("rejects X-Workspace-Id pointing at another tenant workspace", async () => {
    const server = app.getHttpServer();
    const res = await request(server)
      .get(ROUTES.WORKSPACES.LIST)
      .set("Authorization", `Bearer ${tenantASession.accessToken}`)
      .set("X-Workspace-Id", tenantB.workspaceId);
    expect(res.status).toBe(403);
  });

  it("rejects reporting API key create with cross-tenant X-Workspace-Id", async () => {
    const adminSession = await loginAs(app, "admin@kloqra.dev");
    const server = app.getHttpServer();

    const res = await request(server)
      .post(ROUTES.REPORTING_API_KEYS.CREATE)
      .set("Authorization", `Bearer ${adminSession.accessToken}`)
      .set("X-Workspace-Id", tenantB.workspaceId)
      .send({
        name: "Cross-tenant probe",
        projectIds: [tenantB.projectId]
      });

    expect(res.status).toBe(403);
  });

  it("rejects reporting API key create with projects outside workspace", async () => {
    const adminSession = await loginAs(app, "admin@kloqra.dev");

    const res = await authedAgent(app, adminSession)
      .post(ROUTES.REPORTING_API_KEYS.CREATE)
      .send({
        name: "Cross-workspace projects",
        projectIds: [tenantB.projectId]
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns tenantId on login session for demo tenant", async () => {
    const session = await loginAs(app, "admin@kloqra.dev");
    expect(session.tenantId).toBe(demoTenantId);

    const me = await authedAgent(app, session).get(ROUTES.AUTH.ME);
    expect(me.status).toBe(200);
    expect(me.body.tenantId).toBe(demoTenantId);
  });

  it("rejects acme-only admin from meridian workspace admin routes (D14)", async () => {
    const isolated = await createIsolatedAcmeMemberFixture(prisma);
    const isolatedSession = await loginAs(app, "isolated-ws-a@kloqra.dev");

    expect(isolatedSession.workspaceId).toBe(isolated.workspaceId);

    const path = `${ROUTES.WORKSPACES.MEMBERS_OVERVIEW(meridianWorkspaceId)}?page=1&limit=20`;
    const res = await authedAgent(app, isolatedSession).get(path);
    expect(res.status).toBe(403);

    await prisma.workspaceMember.deleteMany({ where: { userId: isolated.userId } });
    await prisma.user.delete({ where: { id: isolated.userId } });
  });
});
