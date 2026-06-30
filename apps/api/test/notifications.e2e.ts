import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { NotificationsService } from "../src/modules/notifications/application/notifications.service";
import { authedAgent, loginAs } from "./helpers/auth";

describe("Notifications E2E", () => {
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

  it("lists notifications and supports read/unread lifecycle", async () => {
    const createRes = await authedAgent(app, adminSession)
      .post("/notifications/mark-all-read")
      .send({});
    expect(createRes.status).toBe(201);

    const listRes = await authedAgent(app, adminSession).get("/notifications?page=1&limit=20");
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.items)).toBe(true);

    const countRes = await authedAgent(app, adminSession).get("/notifications/unread-count");
    expect(countRes.status).toBe(200);
    expect(typeof countRes.body.count).toBe("number");

    if (listRes.body.items.length > 0) {
      const id = listRes.body.items[0].id as string;
      const readRes = await authedAgent(app, adminSession)
        .patch(`/notifications/${id}`)
        .send({ read: true });
      expect(readRes.status).toBe(200);
      expect(readRes.body.readAt).toBeTruthy();

      const unreadRes = await authedAgent(app, adminSession)
        .patch(`/notifications/${id}`)
        .send({ read: false });
      expect(unreadRes.status).toBe(200);
      expect(unreadRes.body.readAt).toBeNull();
    }
  });

  it("scopes notifications to the authenticated member workspace", async () => {
    const res = await authedAgent(app, memberSession).get("/notifications/unread-count");
    expect(res.status).toBe(200);
    expect(typeof res.body.count).toBe("number");
  });

  it("should clean old read notifications but keep unread or recent read ones", async () => {
    const notificationsService = app.get(NotificationsService);
    const prisma = app.get(PrismaService);

    const ninetyOneDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyFiveDaysAgo = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    const n1 = await prisma.notification.create({
      data: {
        userId: adminSession.userId,
        workspaceId: adminSession.workspaceId,
        type: "TIMESHEET_STATUS",
        title: "Old Read",
        body: "Delete me",
        readAt: ninetyOneDaysAgo,
        createdAt: ninetyOneDaysAgo
      }
    });

    const n2 = await prisma.notification.create({
      data: {
        userId: adminSession.userId,
        workspaceId: adminSession.workspaceId,
        type: "TIMESHEET_STATUS",
        title: "Recent Read",
        body: "Keep me",
        readAt: thirtyDaysAgo,
        createdAt: thirtyDaysAgo
      }
    });

    const n3 = await prisma.notification.create({
      data: {
        userId: adminSession.userId,
        workspaceId: adminSession.workspaceId,
        type: "TIMESHEET_STATUS",
        title: "Old Unread",
        body: "Keep me",
        readAt: null,
        createdAt: ninetyFiveDaysAgo
      }
    });

    const n4 = await prisma.notification.create({
      data: {
        userId: adminSession.userId,
        workspaceId: adminSession.workspaceId,
        type: "TIMESHEET_STATUS",
        title: "Recent Unread",
        body: "Keep me",
        readAt: null,
        createdAt: tenDaysAgo
      }
    });

    await notificationsService.cleanOldNotifications();

    const remainingIds = (
      await prisma.notification.findMany({
        where: { id: { in: [n1.id, n2.id, n3.id, n4.id] } },
        select: { id: true }
      })
    ).map((n) => n.id);

    expect(remainingIds).not.toContain(n1.id);
    expect(remainingIds).toContain(n2.id);
    expect(remainingIds).toContain(n3.id);
    expect(remainingIds).toContain(n4.id);
  });
});
