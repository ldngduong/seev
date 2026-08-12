import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { ExternalJobResearchService } from '../external-job-research.service';
import { EXTERNAL_JOB_RESEARCH_JOB, EXTERNAL_JOB_RESEARCH_QUEUE, type ExternalJobResearchJobData } from '../types/external-job-research-queue.type';

@Processor(EXTERNAL_JOB_RESEARCH_QUEUE, { maxStalledCount: 2, stalledInterval: 60_000, maxStartedAttempts: 1 })
export class ExternalJobResearchProcessor extends WorkerHost {
  private readonly logger = new Logger(ExternalJobResearchProcessor.name);
  constructor(private readonly service: ExternalJobResearchService) { super(); }
  async process(job: Job<ExternalJobResearchJobData>) {
    if (job.name !== EXTERNAL_JOB_RESEARCH_JOB) return;
    return this.service.process(job.data.researchId, job.data.attempt, job.data);
  }
  @OnWorkerEvent('failed')
  async failed(job: Job<ExternalJobResearchJobData> | undefined, error: Error) {
    if (!job) return;
    this.logger.error(`External job research ${job.data.researchId} failed: ${error.message}`);
    await this.service.fail(job.data.researchId, job.data.attempt, error.message, true);
  }
}
