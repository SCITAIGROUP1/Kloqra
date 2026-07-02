import { PLAN_IDS, PLAN_SLUGS, ROUTES } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { loginAs } from "./helpers/auth";
import { loginAsPlatform, platformAuthedAgent } from "./helpers/platform-auth";

describe("Platform audit E2E", () => {
  let app: INestApplication;
  let platformUserId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("has no platform impersonation routes in contracts", () => {
    const platformRoutes = Object.values(ROUTES.PLATFORM).flatMap((route) =>
      typeof route === "function" ? [route("test-id", "test-id", "test-id")] : [route]
    );
    expect(platformRoutes.some((route) => route.includes("impersonate"))).toBe(false);
    expect(ROUTES.AUTH.IMPERSONATE).toBe("/auth/impersonate");
  });

  it("returns 404 for platform impersonation HTTP paths (D13)", async () => {
    const platform = await loginAsPlatform(app);
    const res = await platformAuthedAgent(app, platform).post(
      "/platform/tenants/test-id/impersonate"
    );
    expect([404, 405]).toContain(res.status);
  });

  it("records platform.login on successful platform auth", async () => {
    const session = await loginAsPlatform(app);
    platformUserId = session.userId;

    const auditRes = await platformAuthedAgent(app, session)
      .get(ROUTES.PLATFORM.AUDIT_EVENTS)
      .query({ limit: 10 });

    expect(auditRes.status).toBe(200);
    const loginEvent = auditRes.body.items.find(
      (item: { action: string }) => item.action === "platform.login"
    );
    expect(loginEvent).toBeTruthy();
    expect(loginEvent.actorPlatformUserId).toBe(platformUserId);
  });

  it("records tenant create, plan override, and suspend actions", async () => {
    const platform = await loginAsPlatform(app);
    const ownerEmail = `f16-audit-${Date.now()}@example.com`;

    const createRes = await platformAuthedAgent(app, platform).post(ROUTES.PLATFORM.TENANTS).send({
      organizationName: "F16 Audit Org",
      ownerEmail,
      planId: PLAN_IDS[PLAN_SLUGS.PILOT],
      subscriptionStatus: "trial"
    });

    expect(createRes.status).toBe(201);
    const tenantId = createRes.body.tenant.id as string;

    const proPlanId = PLAN_IDS[PLAN_SLUGS.PRO];
    const patchRes = await platformAuthedAgent(app, platform)
      .patch(ROUTES.PLATFORM.TENANT(tenantId))
      .send({ planId: proPlanId });

    expect(patchRes.status).toBe(200);

    const suspendRes = await platformAuthedAgent(app, platform).post(
      ROUTES.PLATFORM.SUSPEND_TENANT(tenantId)
    );
    expect(suspendRes.status).toBe(201);

    const auditRes = await platformAuthedAgent(app, platform)
      .get(ROUTES.PLATFORM.AUDIT_EVENTS)
      .query({ tenantId, limit: 25 });

    expect(auditRes.status).toBe(200);
    const actions = auditRes.body.items.map((item: { action: string }) => item.action);
    expect(actions).toContain("platform.tenant.created");
    expect(actions).toContain("platform.tenant.updated");
    expect(actions).toContain("platform.tenant.suspended");

    const updated = auditRes.body.items.find(
      (item: { action: string }) => item.action === "platform.tenant.updated"
    );
    expect(updated.summary.planId).toBeTruthy();
  });

  it("rejects tenant JWT on platform audit endpoint", async () => {
    const tenantSession = await loginAs(app, "admin@kloqra.dev");
    const res = await platformAuthedAgent(app, tenantSession).get(ROUTES.PLATFORM.AUDIT_EVENTS);
    expect(res.status).toBe(401);
  });

  it("supports action filter on audit list", async () => {
    const platform = await loginAsPlatform(app);
    const res = await platformAuthedAgent(app, platform)
      .get(ROUTES.PLATFORM.AUDIT_EVENTS)
      .query({ action: "platform.login", limit: 5 });

    expect(res.status).toBe(200);
    expect(
      res.body.items.every((item: { action: string }) => item.action === "platform.login")
    ).toBe(true);
  });
});
