import { PLAN_IDS, PLAN_SLUGS, ROUTES, reportingApiKeyHeaders } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { authedAgent } from "./helpers/auth";
import { loginAsPlatform, platformAuthedAgent } from "./helpers/platform-auth";

describe("Platform tenant suspend E2E", () => {
  let app: INestApplication;
  const ownerEmail = `f15-suspend-${Date.now()}@example.com`;
  let temporaryPassword: string;
  let ownerSession: { accessToken: string; workspaceId: string };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    const platform = await loginAsPlatform(app);
    const createRes = await platformAuthedAgent(app, platform)
      .post(ROUTES.PLATFORM.TENANTS)
      .send({
        organizationName: "F15 Suspend Org",
        ownerEmail,
        planId: PLAN_IDS[PLAN_SLUGS.PILOT],
        firstWorkspace: { name: "Suspend Workspace" }
      });
    temporaryPassword = createRes.body.temporaryPassword;
    const tenantId = createRes.body.tenant.id;

    const loginRes = await request(app.getHttpServer())
      .post(ROUTES.AUTH.LOGIN)
      .set("X-Auth-Scope", "admin")
      .send({ email: ownerEmail, password: temporaryPassword });
    const setPasswordRes = await request(app.getHttpServer())
      .post(ROUTES.AUTH.SET_PASSWORD)
      .set("X-Auth-Scope", "admin")
      .send({
        pendingToken: loginRes.body.pendingToken,
        newPassword: "SuspendPass123!"
      });
    ownerSession = {
      accessToken: setPasswordRes.body.accessToken,
      workspaceId: setPasswordRes.body.workspaceId
    };

    const suspendRes = await platformAuthedAgent(app, platform).post(
      ROUTES.PLATFORM.SUSPEND_TENANT(tenantId)
    );
    expect(suspendRes.status).toBe(201);
    expect(suspendRes.body.status).toBe("suspended");
  });

  afterAll(async () => {
    await app.close();
  });

  it("suspended tenant owner cannot log in", async () => {
    const loginRes = await request(app.getHttpServer())
      .post(ROUTES.AUTH.LOGIN)
      .set("X-Auth-Scope", "admin")
      .send({ email: ownerEmail, password: "SuspendPass123!" });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.code).toBe("FORBIDDEN");
  });

  it("suspended tenant cannot start timer", async () => {
    const res = await authedAgent(app, ownerSession)
      .post("/timer/start")
      .send({ taskId: "00000000-0000-4000-8000-000000000099" });
    expect(res.status).toBe(403);
  });
});

describe("Platform tenant suspend — reporting API keys", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const ownerEmail = `f19-suspend-keys-${Date.now()}@example.com`;
  let apiKey: string;
  let secret: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);

    const platform = await loginAsPlatform(app);
    const createRes = await platformAuthedAgent(app, platform)
      .post(ROUTES.PLATFORM.TENANTS)
      .send({
        organizationName: "F19 Suspend Keys Org",
        ownerEmail,
        planId: PLAN_IDS[PLAN_SLUGS.PILOT],
        firstWorkspace: { name: "Keys Workspace" }
      });
    const temporaryPassword = createRes.body.temporaryPassword;
    const tenantId = createRes.body.tenant.id;

    const loginRes = await request(app.getHttpServer())
      .post(ROUTES.AUTH.LOGIN)
      .set("X-Auth-Scope", "admin")
      .send({ email: ownerEmail, password: temporaryPassword });
    const setPasswordRes = await request(app.getHttpServer())
      .post(ROUTES.AUTH.SET_PASSWORD)
      .set("X-Auth-Scope", "admin")
      .send({
        pendingToken: loginRes.body.pendingToken,
        newPassword: "SuspendKeys123!"
      });
    const ownerSession = {
      accessToken: setPasswordRes.body.accessToken,
      workspaceId: setPasswordRes.body.workspaceId
    };

    const project = await prisma.project.create({
      data: {
        workspaceId: ownerSession.workspaceId,
        name: "Suspend Keys Project",
        clientName: "F19 Test",
        team: { create: {} }
      }
    });

    const keyRes = await authedAgent(app, ownerSession)
      .post(ROUTES.REPORTING_API_KEYS.CREATE)
      .send({ name: "Pre-suspend key", projectIds: [project.id] });
    expect(keyRes.status).toBe(201);
    apiKey = keyRes.body.apiKey;
    secret = keyRes.body.secret;

    const suspendRes = await platformAuthedAgent(app, platform).post(
      ROUTES.PLATFORM.SUSPEND_TENANT(tenantId)
    );
    expect(suspendRes.status).toBe(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it("revokes reporting API keys on suspend", async () => {
    const res = await request(app.getHttpServer())
      .get("/public/reporting/dashboard?from=2026-01-01T00:00:00.000Z&to=2026-01-31T23:59:59.999Z")
      .set(reportingApiKeyHeaders.API_KEY, apiKey)
      .set(reportingApiKeyHeaders.API_SECRET, secret);

    expect([401, 403]).toContain(res.status);
  });
});
