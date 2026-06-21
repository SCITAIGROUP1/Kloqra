import type { BulkCategoryImportItemDto } from "@kloqra/contracts";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { QUEUES } from "../../../common/queues";

export interface BulkCategoryJobPayload {
  workspaceId: string;
  categories: BulkCategoryImportItemDto[];
}

@Processor(QUEUES.BULK_CATEGORY)
export class BulkCategoryWorker extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<BulkCategoryJobPayload, unknown, string>) {
    const { workspaceId, categories } = job.data;

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error("Workspace not found");

    let successCount = 0;
    let skippedCount = 0;
    const seenNames = new Set<string>();

    for (const item of categories) {
      const name = item.name.trim();
      if (!name) {
        skippedCount++;
        continue;
      }

      const normalizedKey = name.toLowerCase();
      if (seenNames.has(normalizedKey)) {
        skippedCount++;
        continue;
      }
      seenNames.add(normalizedKey);

      const existing = await this.prisma.category.findFirst({
        where: { workspaceId, name }
      });
      if (existing) {
        skippedCount++;
        continue;
      }

      await this.prisma.category.create({
        data: {
          workspaceId,
          name,
          description: item.description?.trim() || null
        }
      });
      successCount++;
    }

    return { successCount, skippedCount, totalProcessed: categories.length };
  }
}
