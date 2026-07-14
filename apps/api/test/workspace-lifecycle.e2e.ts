import { ROUTES } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PrismaClient } from "../prisma/generated/client";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { authedAgent, loginAs } from "./helpers/auth";
import {
  cleanupTenantIsolationFixtures,
  createTenantBFixture,
  TENANT_B_OWNER_EMAIL
} from "./helpers/tenant-isolation-fixture";

function tenantDb(prisma: PrismaService): PrismaClient {
  return prisma as unknown as PrismaClient;
}

describe("Workspace lifecycle E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminSession: Awaited<ReturnType<typeof loginAs>>;
  const createdWorkspaceIds: string[] = [];
  const uniqueSuffix = Date.now();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    await cleanupTenantIsolationFixtures(prisma);
    await createTenantBFixture(prisma);
    adminSession = await loginAs(app, "admin@kloqra.dev");
  });

  afterAll(async () => {
    const db = tenantDb(prisma);
    if (createdWorkspaceIds.length > 0) {
      await db.workspaceMember.deleteMany({
        where: { workspaceId: { in: createdWorkspaceIds } }
      });
      await db.workspace.deleteMany({ where: { id: { in: createdWorkspaceIds } } });
    }
    await db.user.deleteMany({
      where: { email: { in: [`ws-admin-shared-${uniqueSuffix}@kloqra.dev`] } }
    });
    await cleanupTenantIsolationFixtures(prisma);
    await app.close();
  });

  it("allows tenant owner to create workspace via TENANTS.WORKSPACES", async () => {
    const res = await authedAgent(app, adminSession)
      .post(ROUTES.TENANTS.WORKSPACES)
      .send({ name: `Lifecycle WS A ${uniqueSuffix}` });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    createdWorkspaceIds.push(res.body.id);

    const workspace = await tenantDb(prisma).workspace.findUniqueOrThrow({
      where: { id: res.body.id }
    });
    expect(workspace.tenantId).toBe(adminSession.tenantId);
  });

  it("allows organization admin to create workspace", async () => {
    const opsSession = await loginAs(app, "ops@kloqra.dev");
    const res = await authedAgent(app, opsSession)
      .post(ROUTES.TENANTS.WORKSPACES)
      .send({ name: `Ops WS ${uniqueSuffix}` });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    createdWorkspaceIds.push(res.body.id);
  });

  it("rejects workspace-only member creating workspace", async () => {
    const memberSession = await loginAs(app, "member@kloqra.dev");
    const res = await authedAgent(app, memberSession)
      .post(ROUTES.TENANTS.WORKSPACES)
      .send({ name: `Member WS ${uniqueSuffix}` });
    expect(res.status).toBe(403);
  });

  it("assigns the same admin to two workspaces with separate invites", async () => {
    const wsARes = await authedAgent(app, adminSession)
      .post(ROUTES.TENANTS.WORKSPACES)
      .send({ name: `Lifecycle WS B ${uniqueSuffix}` });
    const wsBRes = await authedAgent(app, adminSession)
      .post(ROUTES.TENANTS.WORKSPACES)
      .send({ name: `Lifecycle WS C ${uniqueSuffix}` });
    expect(wsARes.status).toBe(201);
    expect(wsBRes.status).toBe(201);
    createdWorkspaceIds.push(wsARes.body.id, wsBRes.body.id);

    const email = `ws-admin-shared-${uniqueSuffix}@kloqra.dev`;
    const inviteA = await authedAgent(app, adminSession)
      .post(ROUTES.WORKSPACES.ASSIGN_ADMIN(wsARes.body.id))
      .send({ email, name: "Shared WS Admin" });
    const inviteB = await authedAgent(app, adminSession)
      .post(ROUTES.WORKSPACES.ASSIGN_ADMIN(wsBRes.body.id))
      .send({ email, name: "Shared WS Admin" });
    expect(inviteA.status).toBe(201);
    expect(inviteB.status).toBe(201);

    const user = await tenantDb(prisma).user.findUniqueOrThrow({ where: { email } });
    const memberships = await tenantDb(prisma).workspaceMember.findMany({
      where: { userId: user.id, workspaceId: { in: [wsARes.body.id, wsBRes.body.id] } }
    });
    expect(memberships).toHaveLength(2);
    expect(memberships.every((row) => row.role === "ADMIN")).toBe(true);
  });

  it("rejects assigning a user from another organization", async () => {
    const wsRes = await authedAgent(app, adminSession)
      .post(ROUTES.TENANTS.WORKSPACES)
      .send({ name: `Lifecycle WS D ${uniqueSuffix}` });
    createdWorkspaceIds.push(wsRes.body.id);

    const res = await authedAgent(app, adminSession)
      .post(ROUTES.WORKSPACES.ASSIGN_ADMIN(wsRes.body.id))
      .send({ email: TENANT_B_OWNER_EMAIL, name: "Owner B" });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CONFLICT");
  });

  it("rejects workspace invite for a user from another organization", async () => {
    const res = await authedAgent(app, adminSession)
      .post(ROUTES.WORKSPACES.INVITE(adminSession.workspaceId))
      .send({ email: TENANT_B_OWNER_EMAIL, name: "Owner B", role: "MEMBER" });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CONFLICT");
  });

  it("rejects duplicate workspace names within the same tenant", async () => {
    const name = `Duplicate Tenant WS ${uniqueSuffix}`;
    const first = await authedAgent(app, adminSession)
      .post(ROUTES.TENANTS.WORKSPACES)
      .send({ name });
    expect(first.status).toBe(201);
    createdWorkspaceIds.push(first.body.id);

    const second = await authedAgent(app, adminSession)
      .post(ROUTES.TENANTS.WORKSPACES)
      .send({ name: name.toUpperCase() });
    expect(second.status).toBe(409);
  });

  it("allows the same workspace name in a different tenant", async () => {
    const sharedName = `Cross Tenant WS ${uniqueSuffix}`;
    const tenantARes = await authedAgent(app, adminSession)
      .post(ROUTES.TENANTS.WORKSPACES)
      .send({ name: sharedName });
    expect(tenantARes.status).toBe(201);
    createdWorkspaceIds.push(tenantARes.body.id);

    const tenantBOwner = await loginAs(app, TENANT_B_OWNER_EMAIL);
    const tenantBRes = await authedAgent(app, tenantBOwner)
      .post(ROUTES.TENANTS.WORKSPACES)
      .send({ name: sharedName });
    expect(tenantBRes.status).toBe(201);

    const tenantBWorkspace = await tenantDb(prisma).workspace.findUniqueOrThrow({
      where: { id: tenantBRes.body.id }
    });
    expect(tenantBWorkspace.tenantId).toBe(tenantBOwner.tenantId);
    await tenantDb(prisma).workspaceMember.deleteMany({
      where: { workspaceId: tenantBRes.body.id }
    });
    await tenantDb(prisma).workspace.delete({ where: { id: tenantBRes.body.id } });
  });
});
