import { ROUTES } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { loginAs } from "./helpers/auth";
import { loginAsPlatform, platformAuthedAgent } from "./helpers/platform-auth";

describe("Platform Subscriptions E2E", () => {
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

  describe("Authorization", () => {
    it("requires platform auth for list, work queue, detail, and events", async () => {
      const invalidAgent = platformAuthedAgent(app, { accessToken: "invalid" });

      const listRes = await invalidAgent.get(ROUTES.PLATFORM.SUBSCRIPTIONS);
      expect(listRes.status).toBe(401);

      const queueRes = await invalidAgent.get(ROUTES.PLATFORM.SUBSCRIPTION_WORK_QUEUE);
      expect(queueRes.status).toBe(401);

      const detailRes = await invalidAgent.get(ROUTES.PLATFORM.SUBSCRIPTION_DETAIL("some-id"));
      expect(detailRes.status).toBe(401);

      const eventsRes = await invalidAgent.get(ROUTES.PLATFORM.SUBSCRIPTION_EVENTS("some-id"));
      expect(eventsRes.status).toBe(401);
    });

    it("rejects tenant admin token on platform subscription endpoints", async () => {
      const tenantSession = await loginAs(app, "admin@kloqra.dev");
      const tenantAgent = platformAuthedAgent(app, tenantSession);

      const res = await tenantAgent.get(ROUTES.PLATFORM.SUBSCRIPTIONS);
      expect(res.status).toBe(401);
    });
  });

  describe("Functionality", () => {
    it("GET /platform/subscriptions lists all subscriptions and filters successfully", async () => {
      const session = await loginAsPlatform(app);
      const agent = platformAuthedAgent(app, session);

      // 1. List all
      const listRes = await agent.get(ROUTES.PLATFORM.SUBSCRIPTIONS);
      expect(listRes.status).toBe(200);
      expect(listRes.body.items).toBeDefined();
      expect(listRes.body.total).toBeGreaterThan(0);
      expect(listRes.body.items.length).toBeGreaterThan(0);

      // Verify shape
      const item = listRes.body.items[0];
      expect(item.tenantId).toBeDefined();
      expect(item.tenantName).toBeDefined();
      expect(item.planName).toBeDefined();
      expect(item.status).toBeDefined();
      expect(item.billingSource).toBeDefined();

      // 2. Filter by status
      const activeRes = await agent.get(`${ROUTES.PLATFORM.SUBSCRIPTIONS}?status=active`);
      expect(activeRes.status).toBe(200);
      activeRes.body.items.forEach((i: any) => {
        expect(i.status).toBe("active");
      });

      // 3. Search by tenant name/slug
      const searchRes = await agent.get(`${ROUTES.PLATFORM.SUBSCRIPTIONS}?search=kloqra`);
      expect(searchRes.status).toBe(200);
      searchRes.body.items.forEach((i: any) => {
        const matches =
          i.tenantName.toLowerCase().includes("kloqra") ||
          i.tenantSlug.toLowerCase().includes("kloqra");
        expect(matches).toBe(true);
      });
    });

    it("GET /platform/subscriptions/work-queue retrieves queue details and aggregate counts", async () => {
      const session = await loginAsPlatform(app);
      const agent = platformAuthedAgent(app, session);

      const res = await agent.get(ROUTES.PLATFORM.SUBSCRIPTION_WORK_QUEUE);
      expect(res.status).toBe(200);
      expect(res.body.counts).toBeDefined();
      expect(res.body.counts.pastDue).toBeDefined();
      expect(res.body.counts.drift).toBeDefined();
      expect(res.body.counts.trialEnding).toBeDefined();
      expect(res.body.counts.salesPending).toBeDefined();
      expect(res.body.counts.receiptReview).toBeDefined();
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it("GET /platform/subscriptions/:tenantId returns subscription detail and event history", async () => {
      const session = await loginAsPlatform(app);
      const agent = platformAuthedAgent(app, session);

      // Fetch a valid tenant ID first
      const listRes = await agent.get(ROUTES.PLATFORM.SUBSCRIPTIONS);
      const tenantId = listRes.body.items[0].tenantId;

      // Get detail
      const detailRes = await agent.get(ROUTES.PLATFORM.SUBSCRIPTION_DETAIL(tenantId));
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.tenantId).toBe(tenantId);
      expect(detailRes.body.tenantName).toBeDefined();
      expect(detailRes.body.planName).toBeDefined();
      expect(detailRes.body.status).toBeDefined();
      expect(Array.isArray(detailRes.body.events)).toBe(true);

      // Get events standalone
      const eventsRes = await agent.get(ROUTES.PLATFORM.SUBSCRIPTION_EVENTS(tenantId));
      expect(eventsRes.status).toBe(200);
      expect(Array.isArray(eventsRes.body.items)).toBe(true);
      expect(eventsRes.body.total).toBeDefined();
    });

    it("GET /platform/subscriptions/:tenantId returns 404 for invalid tenant", async () => {
      const session = await loginAsPlatform(app);
      const agent = platformAuthedAgent(app, session);

      const res = await agent.get(
        ROUTES.PLATFORM.SUBSCRIPTION_DETAIL("00000000-0000-0000-0000-000000000000")
      );
      expect(res.status).toBe(404);
    });
  });
});
