import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { platformAuthedAgent, loginAsPlatform } from "./helpers/platform-auth";

describe("Platform notifications E2E", () => {
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

  it("lists platform notifications and unread count", async () => {
    const session = await loginAsPlatform(app);
    const listRes = await platformAuthedAgent(app, session).get("/platform/notifications");
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.items)).toBe(true);

    const countRes = await platformAuthedAgent(app, session).get(
      "/platform/notifications/unread-count"
    );
    expect(countRes.status).toBe(200);
    expect(typeof countRes.body.count).toBe("number");
  });

  it("marks notifications read when present", async () => {
    const session = await loginAsPlatform(app);
    const listRes = await platformAuthedAgent(app, session).get("/platform/notifications");
    const first = listRes.body.items?.[0];
    if (!first) return;

    const patchRes = await platformAuthedAgent(app, session)
      .patch(`/platform/notifications/${first.id}`)
      .send({ read: true });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.readAt).toBeTruthy();
  });
});
