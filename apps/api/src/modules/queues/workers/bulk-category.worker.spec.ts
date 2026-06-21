import { describe, expect, it, vi, beforeEach } from "vitest";
import { BulkCategoryWorker } from "./bulk-category.worker";

type AnyMock = ReturnType<typeof vi.fn>;

function makePrisma() {
  return {
    workspace: {
      findUnique: vi.fn() as AnyMock
    },
    category: {
      findFirst: vi.fn() as AnyMock,
      create: vi.fn() as AnyMock
    }
  };
}

describe("BulkCategoryWorker", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let worker: BulkCategoryWorker;

  beforeEach(() => {
    prisma = makePrisma();
    worker = new BulkCategoryWorker(prisma as any);
    prisma.workspace.findUnique.mockResolvedValue({ id: "w1", name: "Acme" });
  });

  it("creates new categories and skips duplicates", async () => {
    prisma.category.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "existing", name: "Design" });
    prisma.category.create.mockResolvedValue({ id: "new" });

    const result = await worker.process({
      data: {
        workspaceId: "w1",
        categories: [
          { name: "Development", description: "Build work" },
          { name: "Design" },
          { name: "Development" }
        ]
      }
    } as any);

    expect(prisma.category.create).toHaveBeenCalledTimes(1);
    expect(prisma.category.create).toHaveBeenCalledWith({
      data: {
        workspaceId: "w1",
        name: "Development",
        description: "Build work"
      }
    });
    expect(result).toEqual({ successCount: 1, skippedCount: 2, totalProcessed: 3 });
  });
});
