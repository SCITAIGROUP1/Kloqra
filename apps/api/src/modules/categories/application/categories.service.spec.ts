import { describe, expect, it, vi, beforeEach } from "vitest";
import { CategoriesService } from "./categories.service";

type AnyMock = ReturnType<typeof vi.fn>;

function makePrisma() {
  return {
    category: {
      findMany: vi.fn() as AnyMock,
      findFirst: vi.fn() as AnyMock,
      create: vi.fn() as AnyMock,
      update: vi.fn() as AnyMock,
      delete: vi.fn() as AnyMock,
      count: vi.fn() as AnyMock
    },
    task: {
      count: vi.fn() as AnyMock
    }
  };
}

describe("CategoriesService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: CategoriesService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new CategoriesService(prisma as any);
  });

  describe("toDto", () => {
    it("returns the public shape, omitting taskCount when not provided", () => {
      const dto = service.toDto({
        id: "c1",
        workspaceId: "w1",
        name: "Design",
        description: null
      });
      expect(dto).toEqual({
        id: "c1",
        workspaceId: "w1",
        name: "Design",
        description: null
      });
    });

    it("includes taskCount when provided", () => {
      const dto = service.toDto(
        { id: "c1", workspaceId: "w1", name: "Design", description: "UI work" },
        3
      );
      expect(dto.taskCount).toBe(3);
      expect(dto.description).toBe("UI work");
    });
  });

  describe("list", () => {
    it("returns categories scoped to the workspace with task counts", async () => {
      prisma.category.count.mockResolvedValue(1);
      prisma.category.findMany.mockResolvedValue([
        {
          id: "c1",
          workspaceId: "w1",
          name: "Design",
          description: null,
          _count: { tasks: 2 }
        }
      ]);
      const result = await service.list("w1", { page: 1, limit: 20 });
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { workspaceId: "w1" },
        include: { _count: { select: { tasks: true } } },
        orderBy: { name: "asc" },
        skip: 0,
        take: 20
      });
      expect(result).toEqual({
        items: [
          {
            id: "c1",
            workspaceId: "w1",
            name: "Design",
            description: null,
            taskCount: 2
          }
        ],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      });
    });
  });

  describe("create", () => {
    it("rejects duplicate names within the same workspace", async () => {
      prisma.category.findFirst.mockResolvedValue({ id: "existing", name: "Design" });
      await expect(service.create("w1", { name: "Design" })).rejects.toThrow(/already exists/i);
      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it("creates a category when the name is free", async () => {
      prisma.category.findFirst.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue({
        id: "new",
        workspaceId: "w1",
        name: "Design",
        description: "UI"
      });
      const result = await service.create("w1", { name: "Design", description: "UI" });
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { workspaceId: "w1", name: "Design", description: "UI" }
      });
      expect(result.id).toBe("new");
      expect(result.taskCount).toBe(0);
    });
  });

  describe("remove", () => {
    it("rejects deletion when the category still has tasks", async () => {
      prisma.category.findFirst.mockResolvedValue({
        id: "c1",
        workspaceId: "w1",
        name: "Design",
        description: null
      });
      prisma.task.count.mockResolvedValue(2);
      await expect(service.remove("w1", "c1")).rejects.toThrow(/still has tasks/i);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it("deletes when no tasks reference the category", async () => {
      prisma.category.findFirst.mockResolvedValue({
        id: "c1",
        workspaceId: "w1",
        name: "Design",
        description: null
      });
      prisma.task.count.mockResolvedValue(0);
      prisma.category.delete.mockResolvedValue({ id: "c1" });
      const result = await service.remove("w1", "c1");
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
      expect(result).toEqual({ ok: true });
    });

    it("404s when the category is not in this workspace (isolation)", async () => {
      prisma.category.findFirst.mockResolvedValue(null);
      await expect(service.remove("w1", "c1")).rejects.toThrow(/not found/i);
      expect(prisma.task.count).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("blocks rename to a name already used in the workspace", async () => {
      prisma.category.findFirst
        .mockResolvedValueOnce({
          id: "c1",
          workspaceId: "w1",
          name: "Design",
          description: null
        })
        .mockResolvedValueOnce({ id: "other", name: "Engineering" });
      await expect(service.update("w1", "c1", { name: "Engineering" })).rejects.toThrow(
        /already exists/i
      );
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it("allows partial update with no name conflict check needed", async () => {
      prisma.category.findFirst.mockResolvedValueOnce({
        id: "c1",
        workspaceId: "w1",
        name: "Design",
        description: null
      });
      prisma.category.update.mockResolvedValue({
        id: "c1",
        workspaceId: "w1",
        name: "Design",
        description: "Refined UI work",
        _count: { tasks: 4 }
      });
      const result = await service.update("w1", "c1", { description: "Refined UI work" });
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { description: "Refined UI work" },
        include: { _count: { select: { tasks: true } } }
      });
      expect(result.taskCount).toBe(4);
    });
  });
});
