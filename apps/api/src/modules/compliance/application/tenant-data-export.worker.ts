import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { QUEUES } from "../../../common/queues";
import { TenantDataExportService } from "./tenant-data-export.service";

@Processor(QUEUES.TENANT_DATA_EXPORT)
export class TenantDataExportWorker extends WorkerHost {
  constructor(private readonly tenantDataExportService: TenantDataExportService) {
    super();
  }

  async process(job: Job<{ jobId: string }>): Promise<{ ok: true; jobId: string }> {
    await this.tenantDataExportService.runJob(job.data.jobId);
    return { ok: true, jobId: job.data.jobId };
  }
}
