import { ErrorCodes, ROUTES } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { loginAsPlatform, platformAuthedAgent } from "./helpers/platform-auth";

describe("Platform tenant delete E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let platformSession: Awaited<ReturnType<typeof loginAsPlatform>>;

  beforeAll(async () => {
    process.env.TENANT_DELETE_MIN_DAYS_AFTER_CHURN = "0";
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);
    platformSession = await loginAsPlatform(app);
  });

  afterAll(async () => {
    delete process.env.TENANT_DELETE_MIN_DAYS_AFTER_CHURN;
    await app.close();
  });

  it("DELETE /platform/tenants/:id rejects active tenant", async () => {
    const demo = await prisma.tenant.findUniqueOrThrow({ where: { slug: "kloqra-demo" } });
    const res = await platformAuthedAgent(app, platformSession).delete(
      ROUTES.PLATFORM.TENANT_DELETE(demo.id)
    );
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(ErrorCodes.TENANT_DELETE_PRECONDITION_FAILED);
  });

  it("DELETE /platform/tenants/:id removes churned tenant after export waived", async () => {
    const slug = `delete-e2e-${Date.now()}`;
    const tenant = await prisma.tenant.create({
      data: {
        name: "Delete E2E",
        slug,
        status: "churned",
        churnedAt: new Date(Date.now() - 86_400_000),
        settings: { exportWaivedAt: new Date().toISOString() }
      }
    });

    const res = await platformAuthedAgent(app, platformSession).delete(
      ROUTES.PLATFORM.TENANT_DELETE(tenant.id)
    );
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const gone = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    expect(gone).toBeNull();
  });
});
