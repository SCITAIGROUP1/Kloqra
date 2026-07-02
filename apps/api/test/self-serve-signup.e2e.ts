import { createHash } from "node:crypto";
import { ErrorCodes, PLAN_SLUGS, ROUTES } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import cookieParser from "cookie-parser";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { authedAgent } from "./helpers/auth";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

describe("Self-serve signup E2E", () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  const ownerEmail = `signup-${Date.now()}@example.com`;
  const password = "Password123!";
  const verifyToken = `verify-${Date.now()}`;

  beforeAll(async () => {
    process.env.SELF_SERVE_SIGNUP_ENABLED = "true";
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    delete process.env.SELF_SERVE_SIGNUP_ENABLED;
    await app.close();
    await prisma.$disconnect();
  });

  it("POST /auth/signup returns 403 when disabled", async () => {
    const prev = process.env.SELF_SERVE_SIGNUP_ENABLED;
    process.env.SELF_SERVE_SIGNUP_ENABLED = "false";
    const res = await request(app.getHttpServer()).post(ROUTES.AUTH.SIGNUP).send({
      email: "disabled@example.com",
      password,
      name: "Disabled User",
      organizationName: "Disabled Org",
      planSlug: PLAN_SLUGS.STARTER
    });
    process.env.SELF_SERVE_SIGNUP_ENABLED = prev;
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("SIGNUP_DISABLED");
  });

  it("POST /auth/signup returns 409 when email already in a tenant (D08)", async () => {
    const res = await request(app.getHttpServer()).post(ROUTES.AUTH.SIGNUP).send({
      email: "admin@kloqra.dev",
      password,
      name: "Duplicate Owner",
      organizationName: "Second Org",
      planSlug: PLAN_SLUGS.STARTER
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe(ErrorCodes.ALREADY_IN_ORGANIZATION);
  });

  it("GET /plans/public lists starter and pro", async () => {
    const res = await request(app.getHttpServer()).get(ROUTES.PLANS.PUBLIC);
    expect(res.status).toBe(200);
    const slugs = res.body.items.map((item: { slug: string }) => item.slug);
    expect(slugs).toContain(PLAN_SLUGS.STARTER);
    expect(slugs).toContain(PLAN_SLUGS.PRO);
    expect(slugs).not.toContain(PLAN_SLUGS.PILOT);
  });

  it("signup → verify email → complete org setup", async () => {
    const signupRes = await request(app.getHttpServer()).post(ROUTES.AUTH.SIGNUP).send({
      email: ownerEmail,
      password,
      name: "Signup Owner",
      organizationName: "Signup Organization",
      planSlug: PLAN_SLUGS.STARTER
    });
    expect(signupRes.status).toBe(201);
    expect(signupRes.body.ok).toBe(true);

    await prisma.user.update({
      where: { email: ownerEmail },
      data: {
        emailVerificationTokenHash: hashToken(verifyToken),
        emailVerificationExpiresAt: new Date(Date.now() + 60 * 60 * 1000)
      }
    });

    const verifyRes = await request(app.getHttpServer())
      .post(ROUTES.AUTH.VERIFY_EMAIL)
      .set("X-Auth-Scope", "admin")
      .send({ token: verifyToken });
    expect(verifyRes.status).toBe(201);
    expect(verifyRes.body.tenantRole).toBe("OWNER");

    const session = {
      accessToken: verifyRes.body.accessToken,
      workspaceId: verifyRes.body.workspaceId
    };

    const tenantRes = await authedAgent(app, session).get(ROUTES.TENANTS.CURRENT);
    expect(tenantRes.status).toBe(200);
    expect(tenantRes.body.status).toBe("pending_setup");

    const subscriptionRes = await authedAgent(app, session).get(ROUTES.TENANTS.SUBSCRIPTION);
    expect(subscriptionRes.status).toBe(200);
    expect(subscriptionRes.body.status).toBe("trial");

    const patchRes = await authedAgent(app, session)
      .patch(ROUTES.TENANTS.CURRENT)
      .send({ name: "Signup Organization", slug: `signup-org-${Date.now()}` });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.status).toBe("active");
  });
});
