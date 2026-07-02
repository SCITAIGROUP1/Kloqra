import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ErrorCodes, ROUTES } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import Stripe from "stripe";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

describe("Stripe webhook E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;

  beforeAll(async () => {
    process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_test_e2e_secret";
    process.env.STRIPE_SECRET_KEY ??= "sk_test_e2e_secret";

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: "kloqra-demo" } });
    tenantId = tenant.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 400 for invalid signature", async () => {
    const res = await request(app.getHttpServer())
      .post(ROUTES.WEBHOOKS.STRIPE)
      .set("stripe-signature", "invalid")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ id: "evt_bad", type: "checkout.session.completed" }));

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(ErrorCodes.VALIDATION_ERROR);
  });

  it("processes checkout.session.completed fixture", async () => {
    const fixturePath = join(__dirname, "fixtures/stripe/checkout.session.completed.json");
    const raw = readFileSync(fixturePath, "utf8").replaceAll("TENANT_ID_PLACEHOLDER", tenantId);
    const payload = JSON.parse(raw) as { id: string; type: string };
    const eventId = `${payload.id}-${Date.now()}`;
    payload.id = eventId;

    const body = JSON.stringify(payload);
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret: process.env.STRIPE_WEBHOOK_SECRET!
    });

    const res = await request(app.getHttpServer())
      .post(ROUTES.WEBHOOKS.STRIPE)
      .set("stripe-signature", signature)
      .set("Content-Type", "application/json")
      .send(body);

    expect(res.status).toBe(201);
    expect(res.body.received).toBe(true);
    expect(res.body.processed).toBe(true);

    const subscription = await prisma.tenantSubscription.findUniqueOrThrow({
      where: { tenantId }
    });
    expect(subscription.stripeCustomerId).toBe("cus_test_demo");
    expect(subscription.stripeSubscriptionId).toBe("sub_test_demo");
    expect(subscription.status).toBe("active");
  });

  it("processes customer.subscription.updated past_due fixture", async () => {
    const fixturePath = join(
      __dirname,
      "fixtures/stripe/customer.subscription.updated.past_due.json"
    );
    const raw = readFileSync(fixturePath, "utf8").replaceAll("TENANT_ID_PLACEHOLDER", tenantId);
    const payload = JSON.parse(raw) as { id: string; type: string };
    payload.id = `${payload.id}-${Date.now()}`;

    const body = JSON.stringify(payload);
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret: process.env.STRIPE_WEBHOOK_SECRET!
    });

    const res = await request(app.getHttpServer())
      .post(ROUTES.WEBHOOKS.STRIPE)
      .set("stripe-signature", signature)
      .set("Content-Type", "application/json")
      .send(body);

    expect(res.status).toBe(201);
    expect(res.body.processed).toBe(true);

    const subscription = await prisma.tenantSubscription.findUniqueOrThrow({
      where: { tenantId }
    });
    expect(subscription.status).toBe("past_due");

    await prisma.tenantSubscription.update({
      where: { tenantId },
      data: { status: "active" }
    });
  });
});
