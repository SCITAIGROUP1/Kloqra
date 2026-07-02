import { ROUTES } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { authedAgent, loginAs } from "./helpers/auth";
import { loginAsPlatform, platformAuthedAgent } from "./helpers/platform-auth";

function analyticsRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString(),
    to: to.toISOString()
  };
}

describe("Tenant analytics E2E", () => {
  let app: INestApplication;
  let ownerSession: Awaited<ReturnType<typeof loginAs>>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
    ownerSession = await loginAs(app, "admin@kloqra.dev");
  });

  afterAll(async () => {
    await app.close();
  });

  it("owner receives tenant analytics summary", async () => {
    const { from, to } = analyticsRange();
    const res = await authedAgent(app, ownerSession).get(
      `${ROUTES.TENANTS.ANALYTICS_SUMMARY}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
    expect(res.status).toBe(200);
    expect(res.body.period.from).toBe(from);
    expect(res.body.totals).toMatchObject({
      totalHours: expect.any(Number),
      billableHours: expect.any(Number),
      billableAmount: expect.any(Number),
      activeMembers: expect.any(Number),
      activeWorkspaces: expect.any(Number),
      currency: expect.any(String)
    });
    expect(Array.isArray(res.body.byWorkspace)).toBe(true);
    expect(res.body.byWorkspace.length).toBeGreaterThan(0);

    const sumHours = res.body.byWorkspace.reduce(
      (sum: number, row: { totalHours: number }) => sum + row.totalHours,
      0
    );
    expect(sumHours).toBe(res.body.totals.totalHours);
  });

  it("workspace admin without owner role is denied", async () => {
    const opsSession = await loginAs(app, "ops@kloqra.dev");
    const { from, to } = analyticsRange();
    const res = await authedAgent(app, opsSession).get(
      `${ROUTES.TENANTS.ANALYTICS_SUMMARY}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
    expect(res.status).toBe(403);
  });

  it("platform token cannot access tenant analytics", async () => {
    const platform = await loginAsPlatform(app);
    const { from, to } = analyticsRange();
    const res = await platformAuthedAgent(app, platform).get(
      `${ROUTES.TENANTS.ANALYTICS_SUMMARY}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
    expect(res.status).toBe(401);
  });
});
