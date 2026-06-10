import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";

describe("Timelogs occupancy E2E", () => {
  let app: INestApplication;
  let memberToken: string;
  let memberWorkspaceId: string;
  let adminToken: string;
  let adminWorkspaceId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    const memberRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "member@kloqra.dev", password: "password123" });
    expect(memberRes.status).toBe(201);
    memberToken = memberRes.body.accessToken;
    memberWorkspaceId = memberRes.body.workspaceId;

    const adminRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "admin@kloqra.dev", password: "password123" });
    expect(adminRes.status).toBe(201);
    adminToken = adminRes.body.accessToken;
    adminWorkspaceId = adminRes.body.workspaceId;
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /timelogs/occupancy returns member intervals across workspaces", async () => {
    const from = new Date();
    from.setDate(from.getDate() - 7);
    const to = new Date();
    to.setDate(to.getDate() + 1);

    const res = await request(app.getHttpServer())
      .get("/timelogs/occupancy")
      .query({ from: from.toISOString(), to: to.toISOString() })
      .set("Authorization", `Bearer ${memberToken}`)
      .set("X-Workspace-Id", memberWorkspaceId);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    if (res.body.items.length > 0) {
      const item = res.body.items[0];
      expect(item).toHaveProperty("workspaceId");
      expect(item).toHaveProperty("workspaceName");
      expect(item).toHaveProperty("label");
      expect(item).toHaveProperty("isLocked");
    }
  });

  it("GET /timelogs/occupancy rejects admin role", async () => {
    const from = new Date();
    from.setDate(from.getDate() - 7);
    const to = new Date();
    to.setDate(to.getDate() + 1);

    const res = await request(app.getHttpServer())
      .get("/timelogs/occupancy")
      .query({ from: from.toISOString(), to: to.toISOString() })
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-Workspace-Id", adminWorkspaceId);

    expect(res.status).toBe(403);
  });
});
