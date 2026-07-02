import { ErrorCodes, PLAN_IDS, PLAN_SLUGS, ROUTES } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { authedAgent } from "./helpers/auth";
import { loginAsPlatform, platformAuthedAgent } from "./helpers/platform-auth";

describe("Platform tenant provision E2E", () => {
  let app: INestApplication;
  const ownerEmail = `f15-owner-${Date.now()}@example.com`;
  let temporaryPassword: string;
  let tenantId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("superadmin provisions tenant with first workspace", async () => {
    const platform = await loginAsPlatform(app);
    const createRes = await platformAuthedAgent(app, platform)
      .post(ROUTES.PLATFORM.TENANTS)
      .send({
        organizationName: "F15 Provisioned Org",
        ownerEmail,
        ownerName: "F15 Owner",
        planId: PLAN_IDS[PLAN_SLUGS.PILOT],
        subscriptionStatus: "trial",
        firstWorkspace: { name: "Primary Workspace" }
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.tenant.status).toBe("pending_setup");
    expect(createRes.body.ownerUserId).toBeTruthy();
    expect(createRes.body.temporaryPassword).toBeTruthy();
    temporaryPassword = createRes.body.temporaryPassword;
    tenantId = createRes.body.tenant.id;
  });

  it("owner must change password before session", async () => {
    const loginRes = await request(app.getHttpServer())
      .post(ROUTES.AUTH.LOGIN)
      .set("X-Auth-Scope", "admin")
      .send({ email: ownerEmail, password: temporaryPassword });

    expect(loginRes.status).toBe(201);
    expect(loginRes.body.requiresPasswordChange).toBe(true);

    const setPasswordRes = await request(app.getHttpServer())
      .post(ROUTES.AUTH.SET_PASSWORD)
      .set("X-Auth-Scope", "admin")
      .send({
        pendingToken: loginRes.body.pendingToken,
        newPassword: "NewPassword123!"
      });

    expect(setPasswordRes.status).toBe(201);
    expect(setPasswordRes.body.tenantId).toBe(tenantId);
    expect(setPasswordRes.body.tenantRole).toBe("OWNER");
  });

  it("owner completes organization setup and tenant becomes active", async () => {
    const loginRes = await request(app.getHttpServer())
      .post(ROUTES.AUTH.LOGIN)
      .set("X-Auth-Scope", "admin")
      .send({ email: ownerEmail, password: "NewPassword123!" });

    expect(loginRes.status).toBe(201);
    const session = {
      accessToken: loginRes.body.accessToken,
      workspaceId: loginRes.body.workspaceId
    };

    const patchRes = await authedAgent(app, session)
      .patch(ROUTES.TENANTS.CURRENT)
      .send({ name: "F15 Provisioned Org", slug: `f15-org-${Date.now()}` });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.status).toBe("active");
  });

  it("rejects provision when owner email already belongs to a tenant (D08)", async () => {
    const platform = await loginAsPlatform(app);
    const res = await platformAuthedAgent(app, platform).post(ROUTES.PLATFORM.TENANTS).send({
      organizationName: "Duplicate Owner Org",
      ownerEmail: "admin@kloqra.dev",
      planId: PLAN_IDS[PLAN_SLUGS.PILOT]
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe(ErrorCodes.ALREADY_IN_ORGANIZATION);
  });
});
