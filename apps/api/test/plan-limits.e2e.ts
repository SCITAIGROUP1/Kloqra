import { ErrorCodes, ROUTES } from "@kloqra/contracts";
import type { ProjectListItemDto } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { authedAgent, loginAs } from "./helpers/auth";
import { listItems } from "./helpers/pagination";
import {
  getTenantSeatCount,
  getTenantWorkspaceCount,
  getTenantReportingApiKeyCount,
  setTenantLimitsOverride
} from "./helpers/plan-limits";

describe("Plan limits E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminSession: Awaited<ReturnType<typeof loginAs>>;
  let acmeWorkspaceId: string;
  let createdWorkspaceId: string | undefined;
  const uniqueSuffix = Date.now();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    adminSession = await loginAs(app, "admin@kloqra.dev");
    const acme = await prisma.workspace.findUniqueOrThrow({ where: { slug: "acme" } });
    acmeWorkspaceId = acme.id;
  });

  afterAll(async () => {
    if (createdWorkspaceId) {
      await prisma.workspaceMember.deleteMany({ where: { workspaceId: createdWorkspaceId } });
      await prisma.workspace.delete({ where: { id: createdWorkspaceId } }).catch(() => undefined);
    }
    if (adminSession?.tenantId) {
      await setTenantLimitsOverride(prisma, adminSession.tenantId, null);
    }
    await app.close();
  });

  it("blocks workspace create when maxWorkspaces is reached", async () => {
    const workspaceCount = await getTenantWorkspaceCount(prisma, adminSession.tenantId);
    await setTenantLimitsOverride(prisma, adminSession.tenantId, { maxWorkspaces: workspaceCount });

    const res = await authedAgent(app, adminSession)
      .post(ROUTES.TENANTS.WORKSPACES)
      .send({ name: `Limit Test WS ${uniqueSuffix}` });

    expect(res.status).toBe(402);
    expect(res.body.code).toBe(ErrorCodes.PLAN_LIMIT_EXCEEDED);
    expect(res.body.details).toMatchObject({
      limit: "maxWorkspaces",
      current: workspaceCount,
      max: workspaceCount
    });
  });

  it("blocks tenant admin invite when seat cap is reached", async () => {
    const seatCount = await getTenantSeatCount(prisma, adminSession.tenantId);
    await setTenantLimitsOverride(prisma, adminSession.tenantId, { maxSeats: seatCount });

    const res = await authedAgent(app, adminSession)
      .post(ROUTES.TENANTS.MEMBERS)
      .send({
        email: `seat-limit-${uniqueSuffix}@kloqra.dev`,
        name: "Seat Limit User",
        role: "ADMIN"
      });

    expect(res.status).toBe(402);
    expect(res.body.code).toBe(ErrorCodes.PLAN_LIMIT_EXCEEDED);
    expect(res.body.details).toMatchObject({
      limit: "maxSeats",
      current: seatCount,
      max: seatCount
    });
  });

  it("blocks assign workspace admin when seat cap is reached", async () => {
    const seatCount = await getTenantSeatCount(prisma, adminSession.tenantId);
    await setTenantLimitsOverride(prisma, adminSession.tenantId, { maxSeats: seatCount });

    const res = await authedAgent(app, adminSession)
      .post(ROUTES.WORKSPACES.ASSIGN_ADMIN(acmeWorkspaceId))
      .send({
        email: `ws-admin-limit-${uniqueSuffix}@kloqra.dev`,
        name: "Workspace Admin Limit"
      });

    expect(res.status).toBe(402);
    expect(res.body.code).toBe(ErrorCodes.PLAN_LIMIT_EXCEEDED);
  });

  it("blocks bulk invite when net-new seats exceed remaining capacity", async () => {
    const seatCount = await getTenantSeatCount(prisma, adminSession.tenantId);
    await setTenantLimitsOverride(prisma, adminSession.tenantId, { maxSeats: seatCount + 1 });

    const res = await authedAgent(app, adminSession)
      .post(ROUTES.WORKSPACES.BULK_MEMBERS(acmeWorkspaceId))
      .send({
        members: [
          {
            email: `bulk-a-${uniqueSuffix}@kloqra.dev`,
            name: "Bulk A",
            role: "MEMBER"
          },
          {
            email: `bulk-b-${uniqueSuffix}@kloqra.dev`,
            name: "Bulk B",
            role: "MEMBER"
          }
        ]
      });

    expect(res.status).toBe(402);
    expect(res.body.code).toBe(ErrorCodes.PLAN_LIMIT_EXCEEDED);
  });

  it("allows workspace create after restoring workspace limit", async () => {
    await setTenantLimitsOverride(prisma, adminSession.tenantId, { maxWorkspaces: 25 });

    const res = await authedAgent(app, adminSession)
      .post(ROUTES.TENANTS.WORKSPACES)
      .send({ name: `Restored Limit WS ${uniqueSuffix}` });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe(`Restored Limit WS ${uniqueSuffix}`);
    createdWorkspaceId = res.body.id as string;
  });

  it("blocks reporting API key create when maxReportingApiKeys is reached", async () => {
    const projectsRes = await authedAgent(app, adminSession).get("/projects");
    const projectId = listItems<ProjectListItemDto>(projectsRes.body)[0]!.id;

    let keyCount = await getTenantReportingApiKeyCount(prisma, adminSession.tenantId);
    if (keyCount === 0) {
      const seedRes = await authedAgent(app, adminSession)
        .post(ROUTES.REPORTING_API_KEYS.CREATE)
        .send({ name: `Seed Key ${uniqueSuffix}`, projectIds: [projectId] });
      expect(seedRes.status).toBe(201);
      keyCount = 1;
    }

    await setTenantLimitsOverride(prisma, adminSession.tenantId, {
      maxReportingApiKeys: keyCount
    });

    const res = await authedAgent(app, adminSession)
      .post(ROUTES.REPORTING_API_KEYS.CREATE)
      .send({ name: `Limit Key ${uniqueSuffix}`, projectIds: [projectId] });

    expect(res.status).toBe(402);
    expect(res.body.code).toBe(ErrorCodes.PLAN_LIMIT_EXCEEDED);
    expect(res.body.details).toMatchObject({
      limit: "maxReportingApiKeys",
      current: keyCount,
      max: keyCount
    });
  });
});
