import { ROUTES } from "@kloqra/contracts";
import { getQueueToken } from "@nestjs/bullmq";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Queue } from "bullmq";
import cookieParser from "cookie-parser";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { generatedPrisma } from "../src/common/prisma/generated-prisma.util";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { QUEUES } from "../src/common/queues";
import {
  buildExportJobStorageKey,
  writeExportJobFile
} from "../src/modules/export/application/export-job-storage.util";
import { authedAgent, loginAs } from "./helpers/auth";

describe("Tenant data export E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerSession: Awaited<ReturnType<typeof loginAs>>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    ownerSession = await loginAs(app, "admin@kloqra.dev");

    const exportQueue = app.get<Queue>(getQueueToken(QUEUES.TENANT_DATA_EXPORT));
    await exportQueue.pause();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /tenants/current/data-export creates a queued job", async () => {
    const createRes = await authedAgent(app, ownerSession)
      .post(ROUTES.TENANTS.DATA_EXPORT)
      .send({});
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe("queued");
    expect(createRes.body.tenantId).toBe(ownerSession.tenantId);
  });

  it("GET download returns ready export file", async () => {
    const db = generatedPrisma(prisma);
    const job = await db.tenantDataExportJob.create({
      data: {
        tenantId: ownerSession.tenantId,
        requestedByUserId: ownerSession.userId,
        status: "ready",
        filename: "kloqra-demo-data-export.zip",
        contentType: "application/zip",
        byteSize: 4,
        storageKey: buildExportJobStorageKey("fixture-export", "zip"),
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 86_400_000)
      }
    });
    await writeExportJobFile(job.storageKey!, Buffer.from("PK\x03\x04"));

    const getRes = await authedAgent(app, ownerSession).get(ROUTES.TENANTS.DATA_EXPORT_JOB(job.id));
    expect(getRes.status).toBe(200);
    expect(getRes.body.status).toBe("ready");

    const downloadRes = await authedAgent(app, ownerSession).get(
      ROUTES.TENANTS.DATA_EXPORT_JOB_DOWNLOAD(job.id)
    );
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers["content-type"]).toContain("zip");
  });

  it("rejects export for churned tenant", async () => {
    const db = generatedPrisma(prisma);
    const tenant = await db.tenant.findUniqueOrThrow({ where: { slug: "kloqra-demo" } });
    const priorStatus = tenant.status;
    const priorChurnedAt = tenant.churnedAt;
    try {
      await db.tenant.update({
        where: { id: tenant.id },
        data: { status: "churned", churnedAt: new Date() }
      });

      const res = await authedAgent(app, ownerSession).post(ROUTES.TENANTS.DATA_EXPORT).send({});
      expect(res.status).toBe(403);
    } finally {
      await db.tenant.update({
        where: { id: tenant.id },
        data: { status: priorStatus, churnedAt: priorChurnedAt }
      });
    }
  });
});
