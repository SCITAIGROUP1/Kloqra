import type { ProjectDto, TaskDto } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AppModule } from "../src/app.module";
import { authedAgent, loginAs } from "./helpers/auth";
import { listItems } from "./helpers/pagination";

describe("Timer E2E", () => {
  let app: INestApplication;
  let memberSession: Awaited<ReturnType<typeof loginAs>>;
  let taskId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    memberSession = await loginAs(app, "member@kloqra.dev");

    const projectsRes = await authedAgent(app, memberSession).get("/projects");
    expect(projectsRes.status).toBe(200);
    const projectId = listItems<ProjectDto>(projectsRes.body)[0]?.id;
    expect(projectId).toBeTruthy();

    const tasksRes = await authedAgent(app, memberSession).get("/tasks").query({ projectId });
    expect(tasksRes.status).toBe(200);
    taskId = listItems<TaskDto>(tasksRes.body)[0]?.id;
    expect(taskId).toBeTruthy();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /timer/active returns empty when no timer is running", async () => {
    try {
      await authedAgent(app, memberSession).post("/timer/discard");
    } catch {
      // no active timer to discard
    }

    const res = await authedAgent(app, memberSession).get("/timer/active");
    expect(res.status).toBe(200);
    expect(res.body === null || Object.keys(res.body).length === 0).toBe(true);
  });

  it("POST /timer/start and POST /timer/stop create a timelog", async () => {
    try {
      await authedAgent(app, memberSession).post("/timer/discard");
    } catch {
      // no active timer to discard
    }

    const startRes = await authedAgent(app, memberSession).post("/timer/start").send({ taskId });
    expect(startRes.status).toBe(201);
    expect(startRes.body.taskId).toBe(taskId);

    const activeRes = await authedAgent(app, memberSession).get("/timer/active");
    expect(activeRes.status).toBe(200);
    expect(activeRes.body?.taskId).toBe(taskId);

    const stopRes = await authedAgent(app, memberSession)
      .post("/timer/stop")
      .send({ description: "E2E timer stop" });
    expect(stopRes.status).toBe(201);
    expect(stopRes.body.taskId).toBe(taskId);
    expect(stopRes.body.durationSec).toBeGreaterThanOrEqual(0);
    expect(stopRes.body.source).toBe("timer");
  });

  it("POST /timer/start returns 409 when timer already active", async () => {
    try {
      await authedAgent(app, memberSession).post("/timer/discard");
    } catch {
      // no active timer to discard
    }

    const first = await authedAgent(app, memberSession).post("/timer/start").send({ taskId });
    expect(first.status).toBe(201);

    const second = await authedAgent(app, memberSession).post("/timer/start").send({ taskId });
    expect(second.status).toBe(409);

    await authedAgent(app, memberSession).post("/timer/stop").send({});
  });
});
