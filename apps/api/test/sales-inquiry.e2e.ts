import { PLAN_IDS, PLAN_SLUGS, ROUTES } from "@kloqra/contracts";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { authedAgent, loginAs } from "./helpers/auth";
import { loginAsPlatform, platformAuthedAgent } from "./helpers/platform-auth";
import {
  cleanupTenantIsolationFixtures,
  createTenantBFixture,
  TENANT_B_OWNER_EMAIL
} from "./helpers/tenant-isolation-fixture";

describe("Sales inquiry E2E", () => {
  let app: INestApplication;
  let ownerSession: Awaited<ReturnType<typeof loginAs>>;
  let platformSession: Awaited<ReturnType<typeof loginAsPlatform>>;
  let tenantId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    const prisma = app.get(PrismaService);
    await cleanupTenantIsolationFixtures(prisma);
    const fixture = await createTenantBFixture(prisma);
    tenantId = fixture.tenantId;

    const starterPlan = await prisma.plan.findUnique({ where: { slug: PLAN_SLUGS.STARTER } });
    if (starterPlan) {
      await prisma.tenantSubscription.update({
        where: { tenantId },
        data: { planId: starterPlan.id, status: "active", trialEndsAt: null }
      });
    }

    ownerSession = await loginAs(app, TENANT_B_OWNER_EMAIL);
    platformSession = await loginAsPlatform(app);
  });

  afterAll(async () => {
    if (app) {
      const prisma = app.get(PrismaService);
      await cleanupTenantIsolationFixtures(prisma);
      await app.close();
    }
  });

  it("owner creates sales inquiry and platform lists it", async () => {
    const createRes = await authedAgent(app, ownerSession)
      .post(ROUTES.TENANTS.SALES_INQUIRY)
      .send({ planSlug: PLAN_SLUGS.PILOT, billingInterval: "monthly", message: "Need enterprise" });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({
      status: "open",
      planName: "Enterprise",
      tenantId
    });

    const getRes = await authedAgent(app, ownerSession).get(ROUTES.TENANTS.SALES_INQUIRY);
    expect(getRes.status).toBe(200);
    expect(getRes.body?.status).toBe("open");

    const listRes = await platformAuthedAgent(app, platformSession).get(
      ROUTES.PLATFORM.TENANT_SALES_INQUIRIES(tenantId)
    );
    expect(listRes.status).toBe(200);
    expect(listRes.body.items.length).toBeGreaterThan(0);
  });

  it("platform sends payment instructions and owner can upload receipt", async () => {
    const getRes = await authedAgent(app, ownerSession).get(ROUTES.TENANTS.SALES_INQUIRY);
    const inquiryId = getRes.body?.id as string;
    expect(inquiryId).toBeTruthy();

    const instructionsRes = await platformAuthedAgent(app, platformSession).post(
      ROUTES.PLATFORM.TENANT_SALES_INQUIRY_SEND_INSTRUCTIONS(tenantId, inquiryId)
    );
    expect(instructionsRes.status).toBe(201);
    expect(instructionsRes.body.status).toBe("awaiting_receipt");

    const uploadRes = await authedAgent(app, ownerSession)
      .post(ROUTES.TENANTS.SALES_INQUIRY_RECEIPTS)
      .attach("file", Buffer.from("%PDF-1.4 test"), {
        filename: "receipt.pdf",
        contentType: "application/pdf"
      });
    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.status).toBe("receipt_submitted");
  });

  it("platform PATCH plan fulfills inquiry", async () => {
    const pilotPlanId = PLAN_IDS[PLAN_SLUGS.PILOT];
    const patchRes = await platformAuthedAgent(app, platformSession)
      .patch(ROUTES.PLATFORM.TENANT(tenantId))
      .send({ planId: pilotPlanId });
    expect(patchRes.status).toBe(200);

    const prisma = app.get(PrismaService);
    const inquiry = await prisma.tenantSalesInquiry.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" }
    });
    expect(inquiry?.status).toBe("fulfilled");
  });
});
