import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { authedAgent, loginAs } from "./helpers/auth";

describe("Categories E2E", () => {
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

  it("GET /categories lists workspace categories for admin", async () => {
    const res = await authedAgent(app, adminSession).get("/categories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty("name");
  });

  it("member cannot POST /categories", async () => {
    const res = await authedAgent(app, memberSession)
      .post("/categories")
      .send({ name: "Blocked Category", color: "#ff0000" });
    expect(res.status).toBe(403);
  });

  it("admin can create, update, and delete an empty category", async () => {
    const createRes = await authedAgent(app, adminSession)
      .post("/categories")
      .send({ name: `E2E Category ${Date.now()}`, color: "#22c55e" });
    expect(createRes.status).toBe(201);
    const categoryId = createRes.body.id;

    const updatedName = `E2E Updated ${Date.now()}`;
    const updateRes = await authedAgent(app, adminSession)
      .patch(`/categories/${categoryId}`)
      .send({ name: updatedName });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe(updatedName);

    const deleteRes = await authedAgent(app, adminSession).del(`/categories/${categoryId}`);
    expect(deleteRes.status).toBe(200);
  });

  it("DELETE /categories returns 409 when tasks reference the category", async () => {
    const listRes = await authedAgent(app, adminSession).get("/categories");
    const withTasks = listRes.body.find((c: { taskCount?: number }) => (c.taskCount ?? 0) > 0);
    expect(withTasks).toBeTruthy();

    const deleteRes = await authedAgent(app, adminSession).del(`/categories/${withTasks.id}`);
    expect(deleteRes.status).toBe(409);
  });
});
