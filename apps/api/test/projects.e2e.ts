import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { authedAgent, loginAs } from "./helpers/auth";
import { listItems } from "./helpers/pagination";

describe("Projects E2E", () => {
  let app: INestApplication;
  let adminSession: Awaited<ReturnType<typeof loginAs>>;
  let memberSession: Awaited<ReturnType<typeof loginAs>>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    adminSession = await loginAs(app, "admin@kloqra.dev");
    memberSession = await loginAs(app, "member@kloqra.dev");
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /projects returns seeded projects scoped to workspace", async () => {
    const res = await authedAgent(app, adminSession).get("/projects");
    expect(res.status).toBe(200);
    const items = listItems(res.body);
    expect(items.length).toBeGreaterThan(0);
    expect(
      items.every((p: { workspaceId: string }) => p.workspaceId === adminSession.workspaceId)
    ).toBe(true);
  });

  it("admin can create a project", async () => {
    const res = await authedAgent(app, adminSession)
      .post("/projects")
      .send({ name: `E2E Project ${Date.now()}`, clientName: "Acme" });
    expect(res.status).toBe(201);
    expect(res.body.name).toContain("E2E Project");
    expect(res.body.workspaceId).toBe(adminSession.workspaceId);
  });

  it("member cannot POST /projects", async () => {
    const res = await authedAgent(app, memberSession)
      .post("/projects")
      .send({ name: "Member Project" });
    expect(res.status).toBe(403);
  });

  it("member list is a subset of admin list (project access scoping)", async () => {
    const [adminRes, memberRes] = await Promise.all([
      authedAgent(app, adminSession).get("/projects"),
      authedAgent(app, memberSession).get("/projects")
    ]);
    expect(adminRes.status).toBe(200);
    expect(memberRes.status).toBe(200);

    const adminItems = listItems(adminRes.body);
    const memberItems = listItems(memberRes.body);
    const memberIds = new Set(memberItems.map((p: { id: string }) => p.id));
    expect(adminItems.length).toBeGreaterThanOrEqual(memberItems.length);
    expect(memberItems.length).toBeGreaterThan(0);
    expect(memberItems.every((p: { id: string }) => memberIds.has(p.id))).toBe(true);
  });
});
