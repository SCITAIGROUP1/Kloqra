import { describe, expect, it } from "vitest";
import {
  listPlatformAuditEventsQuerySchema,
  platformAuditActionSchema,
  platformAuditEventSchema
} from "./platform-audit.dto";

const EVENT_ID = "00000000-0000-4000-8000-000000000001";
const ACTOR_ID = "00000000-0000-4000-8000-000000000002";
const TENANT_ID = "00000000-0000-4000-8000-000000000003";

describe("platformAuditActionSchema", () => {
  it("accepts known platform audit actions", () => {
    expect(platformAuditActionSchema.safeParse("platform.login").success).toBe(true);
    expect(platformAuditActionSchema.safeParse("platform.tenant.created").success).toBe(true);
    expect(platformAuditActionSchema.safeParse("platform.tenant.suspended").success).toBe(true);
  });

  it("rejects unknown actions", () => {
    expect(platformAuditActionSchema.safeParse("platform.impersonate").success).toBe(false);
  });
});

describe("platformAuditEventSchema", () => {
  it("accepts audit event row", () => {
    const result = platformAuditEventSchema.safeParse({
      id: EVENT_ID,
      actorPlatformUserId: ACTOR_ID,
      actorEmail: "platform@kloqra.dev",
      actorName: "Platform Admin",
      action: "platform.tenant.created",
      tenantId: TENANT_ID,
      summary: { organizationName: "Acme", slug: "acme" },
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
      createdAt: "2026-01-01T00:00:00.000Z"
    });
    expect(result.success).toBe(true);
  });
});

describe("listPlatformAuditEventsQuerySchema", () => {
  it("accepts pagination and filters", () => {
    const result = listPlatformAuditEventsQuerySchema.safeParse({
      page: 1,
      limit: 25,
      tenantId: TENANT_ID,
      action: "platform.login",
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-02-01T00:00:00.000Z"
    });
    expect(result.success).toBe(true);
  });
});
