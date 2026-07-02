import { PLAN_SLUGS, ROUTES } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { authedAgent, loginAs } from "./helpers/auth";

describe("Subscription plan change E2E", () => {
  let app: INestApplication;
  let adminSession: Awaited<ReturnType<typeof loginAs>>;
  const originalSimulate = process.env.BILLING_SIMULATE_CHECKOUT;
  const originalStripe = process.env.STRIPE_SECRET_KEY;

  beforeAll(async () => {
    process.env.BILLING_SIMULATE_CHECKOUT = "true";
    process.env.STRIPE_SECRET_KEY = "sk_test_e2e";

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    adminSession = await loginAs(app, "admin@kloqra.dev");
  });

  afterAll(async () => {
    if (adminSession) {
      await authedAgent(app, adminSession)
        .patch(ROUTES.TENANTS.SUBSCRIPTION)
        .send({ planSlug: PLAN_SLUGS.STARTER })
        .catch(() => undefined);
      const prisma = app.get(PrismaService);
      const pilotPlan = await prisma.plan.findUnique({ where: { slug: PLAN_SLUGS.PILOT } });
      if (pilotPlan) {
        await prisma.tenantSubscription.update({
          where: { tenantId: adminSession.tenantId },
          data: { planId: pilotPlan.id, status: "active", trialEndsAt: null }
        });
      }
    }

    if (originalSimulate === undefined) {
      delete process.env.BILLING_SIMULATE_CHECKOUT;
    } else {
      process.env.BILLING_SIMULATE_CHECKOUT = originalSimulate;
    }
    if (originalStripe === undefined) {
      delete process.env.STRIPE_SECRET_KEY;
    } else {
      process.env.STRIPE_SECRET_KEY = originalStripe;
    }

    await app.close();
  });

  it("returns billingMode on GET subscription", async () => {
    const res = await authedAgent(app, adminSession).get(ROUTES.TENANTS.SUBSCRIPTION);
    expect(res.status).toBe(200);
    expect(res.body.billingMode).toBe("simulated");
  });

  it("owner PATCH changes plan to starter with active status", async () => {
    const res = await authedAgent(app, adminSession)
      .patch(ROUTES.TENANTS.SUBSCRIPTION)
      .send({ planSlug: PLAN_SLUGS.STARTER });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      tenantId: adminSession.tenantId,
      planName: "Starter",
      status: "active",
      billingMode: "simulated",
      limits: { maxWorkspaces: 3, maxSeats: 10, maxReportingApiKeys: 5 }
    });

    const getRes = await authedAgent(app, adminSession).get(ROUTES.TENANTS.SUBSCRIPTION);
    expect(getRes.body.planName).toBe("Starter");
  });

  it("owner PATCH can upgrade to pro", async () => {
    const res = await authedAgent(app, adminSession)
      .patch(ROUTES.TENANTS.SUBSCRIPTION)
      .send({ planSlug: PLAN_SLUGS.PRO });

    expect(res.status).toBe(200);
    expect(res.body.planName).toBe("Pro");
    expect(res.body.limits).toMatchObject({ maxWorkspaces: 10, maxSeats: 50 });
  });

  it("rejects PATCH for tenant admin", async () => {
    const opsSession = await loginAs(app, "ops@kloqra.dev");
    const res = await authedAgent(app, opsSession)
      .patch(ROUTES.TENANTS.SUBSCRIPTION)
      .send({ planSlug: PLAN_SLUGS.STARTER });
    expect(res.status).toBe(403);
  });

  it("rejects PATCH when simulated billing is disabled", async () => {
    process.env.BILLING_SIMULATE_CHECKOUT = "false";
    process.env.STRIPE_SECRET_KEY = "sk_test_e2e";

    const res = await authedAgent(app, adminSession)
      .patch(ROUTES.TENANTS.SUBSCRIPTION)
      .send({ planSlug: PLAN_SLUGS.STARTER });

    expect(res.status).toBe(403);

    process.env.BILLING_SIMULATE_CHECKOUT = "true";
  });
});
