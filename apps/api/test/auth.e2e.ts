import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { authedAgent, loginAs } from "./helpers/auth";

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

  it("POST /auth/login rejects invalid credentials", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "member@kloqra.dev", password: "wrong-password" });
    expect(res.status).toBe(401);
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
    expect(res.body.user.email).toBe("member@kloqra.dev");
    expect(res.body.workspaceRole).toBe("MEMBER");
  });

  it("DELETE /auth/logout succeeds for authenticated user", async () => {
    const session = await loginAs(app, "member@kloqra.dev");
    const logoutRes = await authedAgent(app, session).del("/auth/logout");
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.ok).toBe(true);
  });
});
