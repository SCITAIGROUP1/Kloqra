import type { CategoryDto } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { authedAgent, loginAs } from "./helpers/auth";
import { listItems } from "./helpers/pagination";

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
    const items = listItems<CategoryDto>(res.body);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty("name");
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

  it("DELETE /categories returns 400 when attempting to delete the default Uncategorized category", async () => {
    const listRes = await authedAgent(app, adminSession).get("/categories");
    const uncategorized = listItems<CategoryDto>(listRes.body).find(
      (c) => c.name === "Uncategorized"
    );
    expect(uncategorized).toBeTruthy();

    const deleteRes = await authedAgent(app, adminSession).del(`/categories/${uncategorized!.id}`);
    expect(deleteRes.status).toBe(400);
  });

  it("DELETE /categories successfully re-associates tasks to Uncategorized and deletes the category", async () => {
    // 1. Create a category
    const catName = `E2E Cat ${Date.now()}`;
    const createCatRes = await authedAgent(app, adminSession)
      .post("/categories")
      .send({ name: catName, color: "#9333ea" });
    expect(createCatRes.status).toBe(201);
    const catId = createCatRes.body.id;

    // 2. Find a project to associate a task
    const projectsRes = await authedAgent(app, adminSession).get("/projects");
    const project = listItems<any>(projectsRes.body)[0];
    expect(project).toBeTruthy();

    // 3. Create a task under that category
    const createTaskRes = await authedAgent(app, adminSession)
      .post("/tasks")
      .send({
        projectId: project.id,
        categoryId: catId,
        taskName: `E2E Task under deleted cat ${Date.now()}`,
        billableDefault: true,
        isCommon: true
      });
    expect(createTaskRes.status).toBe(201);
    const taskId = createTaskRes.body.id;

    // 4. Delete the category (should return 200 and re-associate the task to Uncategorized)
    const deleteRes = await authedAgent(app, adminSession).del(`/categories/${catId}`);
    expect(deleteRes.status).toBe(200);

    // 5. Verify the task's category is now "Uncategorized"
    const listTasksRes = await authedAgent(app, adminSession).get(`/tasks?projectId=${project.id}`);
    const taskItem = listItems<any>(listTasksRes.body).find((t) => t.id === taskId);
    expect(taskItem).toBeTruthy();
    expect(taskItem.categoryName).toBe("Uncategorized");
  });
});
