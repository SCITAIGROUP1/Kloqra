import { describe, expect, it } from "vitest";
import {
  createTenantDataExportSchema,
  deleteTenantResponseSchema,
  tenantDataExportJobSchema
} from "./compliance.dto";

describe("compliance.dto", () => {
  it("accepts empty create tenant data export body", () => {
    expect(createTenantDataExportSchema.parse({})).toEqual({});
  });

  it("parses tenant data export job", () => {
    const parsed = tenantDataExportJobSchema.parse({
      id: "00000000-0000-4000-8000-000000000001",
      tenantId: "00000000-0000-4000-8000-000000000002",
      requestedByUserId: "00000000-0000-4000-8000-000000000003",
      status: "ready",
      filename: "org-export.zip",
      contentType: "application/zip",
      byteSize: 1024,
      errorMessage: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:01:00.000Z",
      expiresAt: "2026-01-08T00:00:00.000Z"
    });
    expect(parsed.status).toBe("ready");
  });

  it("parses delete tenant response", () => {
    expect(
      deleteTenantResponseSchema.parse({
        ok: true,
        deletedTenantId: "00000000-0000-4000-8000-000000000001"
      })
    ).toEqual({
      ok: true,
      deletedTenantId: "00000000-0000-4000-8000-000000000001"
    });
  });
});
