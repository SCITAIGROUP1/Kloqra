import { describe, expect, it, vi, beforeEach } from "vitest";
import { TenantDataExportService } from "./tenant-data-export.service";

describe("TenantDataExportService", () => {
  let service: TenantDataExportService;
  let mockPrisma: any;
  let mockQueue: { add: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockQueue = { add: vi.fn().mockResolvedValue(undefined) };
    mockPrisma = {
      tenant: {
        findUnique: vi.fn().mockResolvedValue({ id: "tenant-1", status: "active" })
      },
      tenantDataExportJob: {
        create: vi.fn().mockResolvedValue({
          id: "job-1",
          tenantId: "tenant-1",
          requestedByUserId: "user-1",
          status: "queued",
          filename: null,
          contentType: null,
          byteSize: null,
          errorMessage: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          completedAt: null,
          expiresAt: new Date("2026-01-08T00:00:00.000Z")
        }),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn()
      }
    };

    service = new TenantDataExportService(
      mockPrisma,
      { generate: vi.fn() } as never,
      { send: vi.fn() } as never,
      { notify: vi.fn().mockResolvedValue(undefined) } as never,
      mockQueue as never
    );
  });

  it("enqueues tenant export job for active tenant", async () => {
    const result = await service.create("tenant-1", "user-1");
    expect(result.status).toBe("queued");
    expect(mockQueue.add).toHaveBeenCalledWith(
      "runTenantExport",
      { jobId: "job-1" },
      { jobId: "job-1" }
    );
  });

  it("rejects export for churned tenant", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: "tenant-1", status: "churned" });
    await expect(service.create("tenant-1", "user-1")).rejects.toSatisfy(
      (err: { code?: string }) => {
        return err.code === "FORBIDDEN";
      }
    );
  });

  describe("cancel", () => {
    it("cancels queued job and removes it from queue", async () => {
      const mockJobRow = {
        id: "job-1",
        tenantId: "tenant-1",
        requestedByUserId: "user-1",
        status: "queued",
        filename: null,
        contentType: null,
        byteSize: null,
        errorMessage: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        completedAt: null,
        expiresAt: new Date("2026-01-08T00:00:00.000Z")
      };

      mockPrisma.tenantDataExportJob.findFirst.mockResolvedValue(mockJobRow);
      const mockBullJob = { remove: vi.fn().mockResolvedValue(undefined) };
      (mockQueue as any).getJob = vi.fn().mockResolvedValue(mockBullJob);

      mockPrisma.tenantDataExportJob.update.mockResolvedValue({
        ...mockJobRow,
        status: "failed",
        errorMessage: "Cancelled by user",
        completedAt: new Date("2026-01-01T01:00:00.000Z")
      });

      const result = await service.cancel("tenant-1", "job-1");
      expect(result.status).toBe("failed");
      expect(result.errorMessage).toBe("Cancelled by user");
      expect(mockQueue.getJob).toHaveBeenCalledWith("job-1");
      expect(mockBullJob.remove).toHaveBeenCalled();
      expect(mockPrisma.tenantDataExportJob.update).toHaveBeenCalledWith({
        where: { id: "job-1" },
        data: expect.objectContaining({
          status: "failed",
          errorMessage: "Cancelled by user"
        })
      });
    });

    it("rejects cancelling already completed job", async () => {
      mockPrisma.tenantDataExportJob.findFirst.mockResolvedValue({
        id: "job-1",
        tenantId: "tenant-1",
        status: "ready"
      });

      await expect(service.cancel("tenant-1", "job-1")).rejects.toSatisfy(
        (err: { code?: string }) => {
          return err.code === "VALIDATION_ERROR";
        }
      );
    });
  });
});
