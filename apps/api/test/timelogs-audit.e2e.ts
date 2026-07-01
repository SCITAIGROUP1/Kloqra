import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { authedAgent, loginAs } from "./helpers/auth";
import { createE2eProjectWithTask } from "./helpers/fixtures";

describe("Timelog Audit E2E", () => {
  let app: INestApplication;
  let adminSession: Awaited<ReturnType<typeof loginAs>>;
  let memberSession: Awaited<ReturnType<typeof loginAs>>;
  let taskId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    adminSession = await loginAs(app, "admin@kloqra.dev");
    memberSession = await loginAs(app, "member@kloqra.dev");

    const fixture = await createE2eProjectWithTask(app, adminSession, {
      teamUserIds: [memberSession.userId]
    });
    taskId = fixture.taskId;

    // Clean up any test logs from previous runs
    const prisma = app.get(PrismaService);
    await prisma.timeLogAuditEvent.deleteMany({
      where: {
        OR: [
          { before: { path: ["startTime"], equals: "2035-01-01T10:00:00.000Z" } },
          { after: { path: ["startTime"], equals: "2035-01-01T10:00:00.000Z" } }
        ]
      }
    });
    await prisma.timeLog.deleteMany({
      where: {
        startTime: new Date("2035-01-01T10:00:00.000Z")
      }
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("Member creates a timelog -> audit event recorded and viewable by member and admin", async () => {
    const startTime = new Date("2035-01-01T10:00:00.000Z");
    const endTime = new Date("2035-01-01T11:00:00.000Z");

    // 1. Member creates a time log
    const createRes = await authedAgent(app, memberSession).post("/timelogs").send({
      taskId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      description: "Audit test manual entry"
    });
    expect(createRes.status).toBe(201);
    const logId = createRes.body.id;

    // 2. Member lists audit events for the timelog
    const auditRes = await authedAgent(app, memberSession).get(`/timelogs/${logId}/audit-events`);
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.items).toHaveLength(1);
    expect(auditRes.body.items[0].action).toBe("CREATE");
    expect(auditRes.body.items[0].actorId).toBe(memberSession.userId);
    expect(auditRes.body.items[0].entryUserId).toBe(memberSession.userId);
    expect(auditRes.body.items[0].before).toBeNull();
    expect(auditRes.body.items[0].after.taskId).toBe(taskId);

    // 3. Admin lists audit events for the timelog
    const adminAuditRes = await authedAgent(app, adminSession).get(
      `/timelogs/${logId}/audit-events`
    );
    expect(adminAuditRes.status).toBe(200);
    expect(adminAuditRes.body.items).toHaveLength(1);

    // 4. Admin queries workspace audit events endpoint GET /timelogs/audit
    const from = new Date();
    from.setDate(from.getDate() - 1);
    const to = new Date();
    to.setDate(to.getDate() + 1);

    const wsAuditRes = await authedAgent(app, adminSession).get("/timelogs/audit").query({
      from: from.toISOString(),
      to: to.toISOString(),
      entryUserId: memberSession.userId
    });
    expect(wsAuditRes.status).toBe(200);
    const found = wsAuditRes.body.items.find((item: any) => item.timeLogId === logId);
    expect(found).toBeDefined();
    expect(found.action).toBe("CREATE");
    expect(found.actorId).toBe(memberSession.userId);

    // 5. Non-admin workspace member queries GET /timelogs/audit -> 403 Forbidden
    const memberForbiddenRes = await authedAgent(app, memberSession).get("/timelogs/audit").query({
      from: from.toISOString(),
      to: to.toISOString()
    });
    expect(memberForbiddenRes.status).toBe(403);
  });
});
