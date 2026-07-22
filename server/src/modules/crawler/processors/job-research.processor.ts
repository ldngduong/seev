import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { JobResearchService } from '../job-research.service';
import { JOB_RESEARCH_JOB, JOB_RESEARCH_QUEUE } from '../types/job-source.type';

@Processor(JOB_RESEARCH_QUEUE)
export class JobResearchProcessor extends WorkerHost {
  private readonly logger = new Logger(JobResearchProcessor.name);

  constructor(private readonly jobResearchService: JobResearchService) {
    super();
  }

  async process(job: Job<{ intentId: string }>) {
    if (job.name !== JOB_RESEARCH_JOB) {
      this.logger.warn(`Ignored unsupported crawler job: ${job.name}`);
      return;
    }

    await this.jobResearchService.processIntent(job.data.intentId);
  }
}
