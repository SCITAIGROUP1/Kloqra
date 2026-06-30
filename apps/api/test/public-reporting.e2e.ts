import type { ProjectListItemDto } from "@kloqra/contracts";
import { reportingApiKeyHeaders } from "@kloqra/contracts";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { authedAgent, loginAs } from "./helpers/auth";
import { listItems } from "./helpers/pagination";

describe("Public reporting API E2E", () => {
  let app: INestApplication;
  let adminSession: Awaited<ReturnType<typeof loginAs>>;
  let projectId: string;
  let apiKey: string;
  let secret: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    adminSession = await loginAs(app, "admin@kloqra.dev");

    const projectsRes = await authedAgent(app, adminSession).get("/projects");
    projectId = listItems<ProjectListItemDto>(projectsRes.body)[0]!.id;

    const createRes = await authedAgent(app, adminSession)
      .post("/reporting-api-keys")
      .send({ name: "E2E public reporting", projectIds: [projectId] });

    expect(createRes.status).toBe(201);
    apiKey = createRes.body.apiKey;
    secret = createRes.body.secret;
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects public reporting without API credentials", async () => {
    const res = await request(app.getHttpServer()).get(
      "/public/reporting/dashboard?from=2026-01-01T00:00:00.000Z&to=2026-01-31T23:59:59.999Z"
    );
    expect(res.status).toBe(401);
  });

  it("returns dashboard data with valid API key and secret", async () => {
    const res = await request(app.getHttpServer())
      .get("/public/reporting/dashboard?from=2026-01-01T00:00:00.000Z&to=2026-01-31T23:59:59.999Z")
      .set(reportingApiKeyHeaders.API_KEY, apiKey)
      .set(reportingApiKeyHeaders.API_SECRET, secret);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("workspace");
    expect(res.body).toHaveProperty("timeByProject");
  });

  it("admin can list reporting API keys", async () => {
    const res = await authedAgent(app, adminSession).get("/reporting-api-keys");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0]).not.toHaveProperty("secret");
  });
});
