import { ROUTES } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { loginAs } from "./helpers/auth";
import { loginAsPlatform, platformAuthedAgent } from "./helpers/platform-auth";

describe("Platform tenants E2E", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /platform/tenants requires platform auth", async () => {
    const res = await platformAuthedAgent(app, { accessToken: "invalid" }).get("/platform/tenants");
    expect(res.status).toBe(401);
  });

  it("GET /platform/tenants lists seeded tenant", async () => {
    const session = await loginAsPlatform(app);
    const res = await platformAuthedAgent(app, session).get("/platform/tenants");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    const demo = res.body.items.find((item: { slug: string }) => item.slug === "kloqra-demo");
    expect(demo).toBeTruthy();
    expect(res.body.total).toBeGreaterThan(0);
  });

  it("GET /platform/tenants supports search and filters", async () => {
    const session = await loginAsPlatform(app);
    const res = await platformAuthedAgent(app, session).get(
      "/platform/tenants?page=1&limit=10&search=kloqra&status=active&planSlug=pilot&subscriptionStatus=active"
    );
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("GET/PATCH /platform/plans exposes catalog config", async () => {
    const session = await loginAsPlatform(app);
    const listRes = await platformAuthedAgent(app, session).get(ROUTES.PLATFORM.PLANS);
    expect(listRes.status).toBe(200);
    expect(listRes.body.items.length).toBeGreaterThan(0);
    const planId = listRes.body.items[0].id as string;

    const detailRes = await platformAuthedAgent(app, session).get(ROUTES.PLATFORM.PLAN(planId));
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.limits).toBeTruthy();

    const patchRes = await platformAuthedAgent(app, session)
      .patch(ROUTES.PLATFORM.PLAN(planId))
      .send({ tagline: "Updated from e2e" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.tagline).toBe("Updated from e2e");
  });

  it("GET /platform/tenants/:id returns tenant detail", async () => {
    const session = await loginAsPlatform(app);
    const listRes = await platformAuthedAgent(app, session).get("/platform/tenants");
    const tenantId =
      listRes.body.items.find((item: { slug: string }) => item.slug === "kloqra-demo")?.id ??
      listRes.body.items[0].id;
    const detailRes = await platformAuthedAgent(app, session).get(`/platform/tenants/${tenantId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.slug).toBe("kloqra-demo");
    expect(detailRes.body.ownerEmail).toBeTruthy();
    expect(detailRes.body.subscription).toBeTruthy();
  });

  it("tenant admin token is rejected on platform tenants", async () => {
    const tenantSession = await loginAs(app, "admin@kloqra.dev");
    const res = await platformAuthedAgent(app, tenantSession).get("/platform/tenants");
    expect(res.status).toBe(401);
  });
});
