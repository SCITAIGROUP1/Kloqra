import { describe, expect, it, vi, beforeEach } from "vitest";
import { TasksService } from "./tasks.service";

type AnyMock = ReturnType<typeof vi.fn>;

function makePrisma() {
  return {
    task: {
      findMany: vi.fn() as AnyMock,
      findFirst: vi.fn() as AnyMock,
      create: vi.fn() as AnyMock,
      update: vi.fn() as AnyMock,
      delete: vi.fn() as AnyMock
    },
    project: {
      findFirst: vi.fn() as AnyMock
    },
    category: {
      findFirst: vi.fn() as AnyMock
    }
  };
}

function makeAccess() {
  return {
    accessibleProjectIds: vi.fn() as AnyMock,
    assertCanAccessProject: vi.fn() as AnyMock
  };
}

describe("TasksService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let access: ReturnType<typeof makeAccess>;
  let service: TasksService;

  beforeEach(() => {
    prisma = makePrisma();
    access = makeAccess();
    service = new TasksService(prisma as any, access as any);
  });

  describe("list", () => {
    it("returns empty when the user has no accessible projects", async () => {
      access.accessibleProjectIds.mockResolvedValue([]);
      const result = await service.list("w1", "u1", "MEMBER");
      expect(result).toEqual([]);
      expect(prisma.task.findMany).not.toHaveBeenCalled();
    });

    it("returns empty when filtering by a project the user cannot access", async () => {
      access.accessibleProjectIds.mockResolvedValue(["p1"]);
      const result = await service.list("w1", "u1", "MEMBER", "p2");
      expect(result).toEqual([]);
      expect(prisma.task.findMany).not.toHaveBeenCalled();
    });

    it("returns tasks with categoryName flattened from the joined relation", async () => {
      access.accessibleProjectIds.mockResolvedValue(["p1"]);
      prisma.task.findMany.mockResolvedValue([
        {
          id: "t1",
          projectId: "p1",
          categoryId: "c1",
          taskName: "Frontend",
          billableDefault: true,
          category: { name: "Software Development" }
        }
      ]);
      const result = await service.list("w1", "u1", "ADMIN");
      expect(result).toEqual([
        {
          id: "t1",
          projectId: "p1",
          categoryId: "c1",
          categoryName: "Software Development",
          taskName: "Frontend",
          billableDefault: true
        }
      ]);
    });

    it("forwards the categoryId filter to prisma", async () => {
      access.accessibleProjectIds.mockResolvedValue(["p1"]);
      prisma.task.findMany.mockResolvedValue([]);
      await service.list("w1", "u1", "ADMIN", undefined, "c1");
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: { in: ["p1"] }, categoryId: "c1" }
        })
      );
    });
  });

  describe("create", () => {
    it("rejects when the project is not in the workspace", async () => {
      prisma.project.findFirst.mockResolvedValue(null);
      await expect(
        service.create("w1", {
          projectId: "p-missing",
          categoryId: "c1",
          taskName: "X",
          billableDefault: true
        })
      ).rejects.toThrow(/project not found/i);
      expect(prisma.category.findFirst).not.toHaveBeenCalled();
      expect(prisma.task.create).not.toHaveBeenCalled();
    });

    it("rejects when the category does not belong to the workspace", async () => {
      prisma.project.findFirst.mockResolvedValue({ id: "p1" });
      prisma.category.findFirst.mockResolvedValue(null);
      await expect(
        service.create("w1", {
          projectId: "p1",
          categoryId: "c-foreign",
          taskName: "X",
          billableDefault: true
        })
      ).rejects.toThrow(/category not found/i);
      expect(prisma.task.create).not.toHaveBeenCalled();
    });

    it("creates a task when project and category both belong to the workspace", async () => {
      prisma.project.findFirst.mockResolvedValue({ id: "p1" });
      prisma.category.findFirst.mockResolvedValue({ id: "c1" });
      prisma.task.create.mockResolvedValue({
        id: "t-new",
        projectId: "p1",
        categoryId: "c1",
        taskName: "Frontend",
        billableDefault: true,
        category: { name: "Software Development" }
      });
      const result = await service.create("w1", {
        projectId: "p1",
        categoryId: "c1",
        taskName: "Frontend",
        billableDefault: true
      });
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: {
          projectId: "p1",
          categoryId: "c1",
          taskName: "Frontend",
          billableDefault: true
        },
        include: { category: { select: { name: true } } }
      });
      expect(result.categoryName).toBe("Software Development");
    });
  });

  describe("update", () => {
    it("validates a new categoryId against the workspace before saving", async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: "t1",
        projectId: "p1",
        categoryId: "c1"
      });
      prisma.category.findFirst.mockResolvedValue(null);
      await expect(service.update("w1", "t1", { categoryId: "c-foreign" })).rejects.toThrow(
        /category not found/i
      );
      expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it("does not re-validate the category when categoryId is unchanged", async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: "t1",
        projectId: "p1",
        categoryId: "c1"
      });
      prisma.task.update.mockResolvedValue({
        id: "t1",
        projectId: "p1",
        categoryId: "c1",
        taskName: "Renamed",
        billableDefault: true,
        category: { name: "Software Development" }
      });
      await service.update("w1", "t1", { taskName: "Renamed" });
      expect(prisma.category.findFirst).not.toHaveBeenCalled();
      expect(prisma.task.update).toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("404s when the task is not in the workspace", async () => {
      prisma.task.findFirst.mockResolvedValue(null);
      await expect(service.remove("w1", "t-missing")).rejects.toThrow(/task not found/i);
      expect(prisma.task.delete).not.toHaveBeenCalled();
    });
  });
});
