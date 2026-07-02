import { ROUTES } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { loginAsPlatform, platformAuthedAgent } from "./helpers/platform-auth";

describe("Platform ops E2E", () => {
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

  it("GET /platform/ops/summary requires platform auth", async () => {
    const res = await request(app.getHttpServer()).get(ROUTES.PLATFORM.OPS_SUMMARY);
    expect(res.status).toBe(401);
  });

  it("returns fleet ops summary for platform superadmin", async () => {
    const platform = await loginAsPlatform(app);
    const res = await platformAuthedAgent(app, platform).get(ROUTES.PLATFORM.OPS_SUMMARY);

    expect(res.status).toBe(200);
    expect(res.body.tenants).toBeTruthy();
    expect(res.body.subscriptions).toBeTruthy();
    expect(res.body.usage.totalWorkspaces).toBeGreaterThanOrEqual(1);
    expect(res.body.usage.totalSeats).toBeGreaterThanOrEqual(1);
    expect(res.body.queues).toBeTruthy();
    expect(res.body.reconcile.lastCheckedAt).toBeTruthy();
  });
});
