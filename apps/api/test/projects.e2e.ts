import type { ProjectListItemDto } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { authedAgent, loginAs } from "./helpers/auth";
import { createE2eProjectWithTask } from "./helpers/fixtures";
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

  it("GET /projects returns workspace projects scoped to the caller", async () => {
    const created = await createE2eProjectWithTask(app, adminSession, {
      teamUserIds: [memberSession.userId]
    });

    const res = await authedAgent(app, adminSession).get("/projects");
    expect(res.status).toBe(200);
    const items = listItems<ProjectListItemDto>(res.body);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((p) => p.id && p.name && typeof p.isActive === "boolean")).toBe(true);
    expect(
      items.every((p) => typeof p.totalTrackedSec === "number" && p.totalTrackedSec >= 0)
    ).toBe(true);
    expect(items.every((p) => p.workspaceId === undefined)).toBe(true);
    expect(items.some((p) => p.id === created.projectId)).toBe(true);
  });

  it("admin can create a project", async () => {
    const res = await authedAgent(app, adminSession)
      .post("/projects")
      .send({ name: `E2E Project ${Date.now()}`, clientName: "Example Client" });
    expect(res.status).toBe(201);
    expect(res.body.name).toContain("E2E Project");
    expect(res.body.workspaceId).toBe(adminSession.workspaceId);
  });

  it("rejects duplicate project names within the workspace", async () => {
    const existingName = `E2E Duplicate ${Date.now()}`;
    const createRes = await authedAgent(app, adminSession)
      .post("/projects")
      .send({ name: existingName, clientName: "First Client" });
    expect(createRes.status).toBe(201);

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
    const fixture = await createE2eProjectWithTask(app, adminSession, {
      teamUserIds: [memberSession.userId]
    });

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
    expect(memberIds.has(fixture.projectId)).toBe(true);
    for (const id of memberIds) {
      expect(adminItems.some((p) => p.id === id)).toBe(true);
    }
  });
});
