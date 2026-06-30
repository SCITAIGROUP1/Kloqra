import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { QUEUES } from "../../../common/queues";
import { ExportJobService } from "./export-job.service";

@Processor(QUEUES.EXPORT)
export class ExportWorker extends WorkerHost {
  constructor(private readonly exportJobService: ExportJobService) {
    super();
  }

  async process(job: Job<{ jobId: string }>): Promise<any> {
    const { jobId } = job.data;
    await this.exportJobService.runJob(jobId);
    return { ok: true, jobId };
  }
}
