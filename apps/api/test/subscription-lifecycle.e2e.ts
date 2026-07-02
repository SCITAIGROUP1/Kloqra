import type { ProjectDto, TaskDto } from "@kloqra/contracts";
import { ErrorCodes, ROUTES } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { authedAgent, loginAs } from "./helpers/auth";
import { listItems } from "./helpers/pagination";
import { setTenantSubscriptionStatus } from "./helpers/subscription-lifecycle";

describe("Subscription lifecycle E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let memberSession: Awaited<ReturnType<typeof loginAs>>;
  let taskId: string;
  let tenantId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    memberSession = await loginAs(app, "member@kloqra.dev");
    tenantId = memberSession.tenantId;

    const projectsRes = await authedAgent(app, memberSession).get("/projects");
    const projectId = listItems<ProjectDto>(projectsRes.body)[0]?.id;
    const tasksRes = await authedAgent(app, memberSession).get("/tasks").query({ projectId });
    taskId = listItems<TaskDto>(tasksRes.body)[0]?.id;
    expect(taskId).toBeTruthy();
  });

  afterAll(async () => {
    await setTenantSubscriptionStatus(prisma, tenantId, "active");
    await app.close();
  });

  it("blocks timer start when subscription is past_due", async () => {
    await setTenantSubscriptionStatus(prisma, tenantId, "past_due");

    const res = await authedAgent(app, memberSession).post(ROUTES.TIMER.START).send({ taskId });
    expect(res.status).toBe(402);
    expect(res.body.code).toBe(ErrorCodes.PAYMENT_REQUIRED);
    expect(res.body.details).toMatchObject({ status: "past_due" });
  });

  it("allows timer start when subscription is active", async () => {
    await setTenantSubscriptionStatus(prisma, tenantId, "active");

    try {
      await authedAgent(app, memberSession).post(ROUTES.TIMER.DISCARD);
    } catch {
      /* no active timer */
    }

    const res = await authedAgent(app, memberSession).post(ROUTES.TIMER.START).send({ taskId });
    expect(res.status).toBe(201);

    await authedAgent(app, memberSession)
      .post(ROUTES.TIMER.STOP)
      .send({ description: "lifecycle e2e" });
  });

  it("blocks timelog create when subscription is canceled", async () => {
    await setTenantSubscriptionStatus(prisma, tenantId, "canceled");

    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10, 0, 0, 0);

    const res = await authedAgent(app, memberSession).post(ROUTES.TIMELOGS.CREATE).send({
      taskId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      description: "blocked"
    });

    expect(res.status).toBe(402);
    expect(res.body.code).toBe(ErrorCodes.PAYMENT_REQUIRED);
  });

  it("blocks timelog create when subscription is past_due", async () => {
    await setTenantSubscriptionStatus(prisma, tenantId, "past_due");

    const start = new Date();
    start.setHours(11, 0, 0, 0);
    const end = new Date(start);
    end.setHours(12, 0, 0, 0);

    const res = await authedAgent(app, memberSession).post(ROUTES.TIMELOGS.CREATE).send({
      taskId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      description: "blocked past due"
    });

    expect(res.status).toBe(402);
    expect(res.body.code).toBe(ErrorCodes.PAYMENT_REQUIRED);
    expect(res.body.details).toMatchObject({ status: "past_due" });

    await setTenantSubscriptionStatus(prisma, tenantId, "active");
  });
});
