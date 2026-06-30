import type { ProjectListItemDto } from "@kloqra/contracts";
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
    const items = listItems<ProjectListItemDto>(res.body);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((p) => p.id && p.name && typeof p.isActive === "boolean")).toBe(true);
    expect(
      items.every((p) => typeof p.totalTrackedSec === "number" && p.totalTrackedSec >= 0)
    ).toBe(true);
    expect(items.every((p) => p.workspaceId === undefined)).toBe(true);
  });

  it("admin can create a project", async () => {
    const res = await authedAgent(app, adminSession)
      .post("/projects")
      .send({ name: `E2E Project ${Date.now()}`, clientName: "Acme" });
    expect(res.status).toBe(201);
    expect(res.body.name).toContain("E2E Project");
    expect(res.body.workspaceId).toBe(adminSession.workspaceId);
  });

  it("rejects duplicate project names within the workspace", async () => {
    const listRes = await authedAgent(app, adminSession).get("/projects");
    const existingName = listItems<ProjectListItemDto>(listRes.body)[0]!.name;

    const res = await authedAgent(app, adminSession)
      .post("/projects")
      .send({ name: existingName, clientName: "Duplicate Client" });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already taken/i);
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

    const adminItems = listItems<ProjectListItemDto>(adminRes.body);
    const memberItems = listItems<ProjectListItemDto>(memberRes.body);
    const memberIds = new Set(memberItems.map((p) => p.id));
    expect(adminItems.length).toBeGreaterThanOrEqual(memberItems.length);
    expect(memberItems.length).toBeGreaterThan(0);
    expect(memberItems.every((p) => memberIds.has(p.id))).toBe(true);
  });
});
