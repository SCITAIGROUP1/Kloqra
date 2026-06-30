import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { authedAgent, loginAs } from "./helpers/auth";

function setCookieHeaders(headers: request.Response["headers"]): string[] {
  const value = headers["set-cookie"];
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

describe("Auth E2E", () => {
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

  it("POST /auth/register returns 403", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/register")
      .set("X-Auth-Scope", "client")
      .send({
        email: "newuser@example.com",
        password: "password123",
        name: "New User"
      });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("SELF_REGISTRATION_DISABLED");
  });

  it("POST /auth/login rejects invalid credentials", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "member@kloqra.dev", password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password. Please try again.");
  });

  it("POST /auth/login returns session for seeded member", async () => {
    const session = await loginAs(app, "member@kloqra.dev");
    expect(session.accessToken).toBeTruthy();
    expect(session.workspaceId).toBeTruthy();
    expect(session.role).toBe("MEMBER");
  });

  it("GET /auth/me returns authenticated user", async () => {
    const session = await loginAs(app, "member@kloqra.dev");
    const res = await authedAgent(app, session).get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBeTruthy();
    expect(res.body.user.name).toBeTruthy();
    expect(res.body.user.email).toBeUndefined();
    expect(res.body.workspaceRole).toBe("MEMBER");
  });

  it("DELETE /auth/logout succeeds for authenticated user", async () => {
    const session = await loginAs(app, "member@kloqra.dev");
    const logoutRes = await authedAgent(app, session).del("/auth/logout");
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.ok).toBe(true);
  });

  it("POST /auth/refresh rotates session with scoped cookie", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .set("X-Auth-Scope", "client")
      .send({ email: "member@kloqra.dev", password: "password123" });
    expect(loginRes.status).toBe(201);
    const cookies = setCookieHeaders(loginRes.headers);
    expect(cookies.length).toBeGreaterThan(0);

    const refreshRes = await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("X-Auth-Scope", "client")
      .set("Cookie", cookies);
    expect(refreshRes.status).toBe(201);
    expect(refreshRes.body.accessToken).toBeTruthy();
    expect(refreshRes.body.user.id).toBeTruthy();
    expect(refreshRes.body.user.name).toBeTruthy();
    expect(refreshRes.body.user.email).toBeUndefined();
  });

  it("POST /auth/refresh returns grace response for duplicate in-flight reuse", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .set("X-Auth-Scope", "client")
      .send({ email: "admin@kloqra.dev", password: "password123" });
    const cookies = setCookieHeaders(loginRes.headers);
    const refreshCookie = cookies.find((c) => c.startsWith("refresh_token_client="));
    expect(refreshCookie).toBeTruthy();
    const rawRefresh = refreshCookie!.split(";")[0]!.split("=")[1]!;

    const first = await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("X-Auth-Scope", "client")
      .set("Cookie", cookies);
    expect(first.status).toBe(201);

    const second = await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("X-Auth-Scope", "client")
      .set("Cookie", [`refresh_token_client=${rawRefresh}`]);
    expect(second.status).toBe(201);
    expect(second.body.accessToken).toBeTruthy();
  });

  it("POST /auth/refresh accepts refresh token in request body", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .set("X-Auth-Scope", "client")
      .send({ email: "member@kloqra.dev", password: "password123" });
    expect(loginRes.status).toBe(201);
    expect(loginRes.body.refreshToken).toBeTruthy();

    const refreshRes = await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("X-Auth-Scope", "client")
      .send({ refreshToken: loginRes.body.refreshToken });
    expect(refreshRes.status).toBe(201);
    expect(refreshRes.body.accessToken).toBeTruthy();
    expect(refreshRes.body.refreshToken).toBeTruthy();
  });

  it("POST /auth/forgot-password returns ok for known and unknown emails", async () => {
    const known = await request(app.getHttpServer())
      .post("/auth/forgot-password")
      .send({ email: "member@kloqra.dev" });
    expect(known.status).toBe(201);
    expect(known.body.ok).toBe(true);

    const unknown = await request(app.getHttpServer())
      .post("/auth/forgot-password")
      .send({ email: "nobody@example.com" });
    expect(unknown.status).toBe(201);
    expect(unknown.body.ok).toBe(true);
  });

  it("POST /auth/resend-verification returns ok", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/resend-verification")
      .send({ email: "member@kloqra.dev" });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });
});
