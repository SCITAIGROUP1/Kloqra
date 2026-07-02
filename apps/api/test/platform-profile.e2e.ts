import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { platformAuthedAgent, loginAsPlatform } from "./helpers/platform-auth";

describe("Platform profile E2E", () => {
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

  it("GET /platform/me returns profile", async () => {
    const session = await loginAsPlatform(app);
    const res = await platformAuthedAgent(app, session).get("/platform/me");
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("platform@kloqra.dev");
    expect(res.body.platformRole).toBe("SUPERADMIN");
  });

  it("PATCH /platform/me updates name", async () => {
    const session = await loginAsPlatform(app);
    const res = await platformAuthedAgent(app, session)
      .patch("/platform/me")
      .send({ name: "Platform Ops" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Platform Ops");

    await platformAuthedAgent(app, session).patch("/platform/me").send({ name: session.user.name });
  });

  it("PATCH /platform/me/preferences stores theme", async () => {
    const session = await loginAsPlatform(app);
    const res = await platformAuthedAgent(app, session)
      .patch("/platform/me/preferences")
      .send({ theme: "dark" });
    expect(res.status).toBe(200);
    expect(res.body.preferences.theme).toBe("dark");
  });

  it("tenant session cannot access platform profile", async () => {
    const res = await request(app.getHttpServer()).get("/platform/me");
    expect(res.status).toBe(401);
  });
});
