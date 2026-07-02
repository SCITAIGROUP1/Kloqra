import { ROUTES } from "@kloqra/contracts";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { authedAgent, loginAs } from "./helpers/auth";
import { loginAsPlatform, setCachedPlatformTotpSecret } from "./helpers/platform-auth";

describe("Platform auth E2E", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
    setCachedPlatformTotpSecret(null);
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /auth/login with platform scope returns session without mandatory 2FA", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .set("X-Auth-Scope", "platform")
      .send({ email: "platform@kloqra.dev", password: "password123" });
    expect(loginRes.status).toBe(201);
    expect(loginRes.body.accessToken).toBeTruthy();
    expect(loginRes.body.platformRole).toBe("SUPERADMIN");
    expect(loginRes.body.user.email).toBe("platform@kloqra.dev");
  });

  it("POST /auth/login with platform scope returns platform session", async () => {
    const session = await loginAsPlatform(app);
    expect(session.accessToken).toBeTruthy();
    expect(session.platformRole).toBe("SUPERADMIN");
    expect(session.user.email).toBe("platform@kloqra.dev");
  });

  it("GET /auth/me returns platform user when scoped", async () => {
    const session = await loginAsPlatform(app);
    const res = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .set("X-Auth-Scope", "platform");
    expect(res.status).toBe(200);
    expect(res.body.platformRole).toBe("SUPERADMIN");
    expect(res.body.user.id).toBe(session.user.id);
  });

  it("GET /platform/me reports twoFactorEnabled false by default", async () => {
    const session = await loginAsPlatform(app);
    const res = await request(app.getHttpServer())
      .get(ROUTES.PLATFORM.ME)
      .set("Authorization", `Bearer ${session.accessToken}`)
      .set("X-Auth-Scope", "platform");
    expect(res.status).toBe(200);
    expect(res.body.twoFactorEnabled).toBe(false);
  });

  it("tenant session cannot access platform tenants", async () => {
    const tenantSession = await loginAs(app, "admin@kloqra.dev");
    const res = await authedAgent(app, tenantSession).get("/platform/tenants");
    expect(res.status).toBe(401);
  });

  it("platform session cannot access tenant workspaces list without tenant token", async () => {
    const platformSession = await loginAsPlatform(app);
    const res = await request(app.getHttpServer())
      .get("/workspaces")
      .set("Authorization", `Bearer ${platformSession.accessToken}`)
      .set("X-Auth-Scope", "platform");
    expect(res.status).toBe(401);
  });

  it("POST /auth/refresh rotates platform session", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .set("X-Auth-Scope", "platform")
      .send({ email: "platform@kloqra.dev", password: "password123" });
    expect(loginRes.status).toBe(201);
    expect(loginRes.body.accessToken).toBeTruthy();

    const cookies = loginRes.headers["set-cookie"];
    const cookieHeader = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];

    const refreshRes = await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("X-Auth-Scope", "platform")
      .set("Cookie", cookieHeader);
    expect(refreshRes.status).toBe(201);
    expect(refreshRes.body.accessToken).toBeTruthy();
    expect(refreshRes.body.platformRole).toBe("SUPERADMIN");
  });

  it("POST /auth/forgot-password with platform scope always returns ok", async () => {
    const res = await request(app.getHttpServer())
      .post(ROUTES.AUTH.FORGOT_PASSWORD)
      .set("X-Auth-Scope", "platform")
      .send({ email: "platform@kloqra.dev" });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });
});
