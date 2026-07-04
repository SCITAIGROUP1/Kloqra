import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { QUEUES } from "../../../common/queues";
import { TenantDataImportService } from "./tenant-data-import.service";

@Processor(QUEUES.TENANT_DATA_IMPORT)
export class TenantDataImportWorker extends WorkerHost {
  constructor(private readonly tenantDataImport: TenantDataImportService) {
    super();
  }

  async process(
    job: Job<{ jobId: string; requestedByUserId: string }>
  ): Promise<{ ok: true; jobId: string }> {
    await this.tenantDataImport.runJob(job.data.jobId, job.data.requestedByUserId);
    return { ok: true, jobId: job.data.jobId };
  }
}
