import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { JobFitService } from '../job-fit.service';
import { JOB_FIT_JOB, JOB_FIT_QUEUE, type JobFitJobData } from '../types/job-fit-queue.type';

@Processor(JOB_FIT_QUEUE, { maxStalledCount: 2, stalledInterval: 60_000, maxStartedAttempts: 1 })
export class JobFitProcessor extends WorkerHost {
  private readonly logger = new Logger(JobFitProcessor.name);
  constructor(private readonly service: JobFitService) { super(); }
  async process(job: Job<JobFitJobData>) {
    if (job.name !== JOB_FIT_JOB) return undefined;
    return this.service.process(job.data.analysisId, job.data.attempt);
  }
  @OnWorkerEvent('failed')
  async failed(job: Job<JobFitJobData> | undefined, error: Error) {
    if (!job) return;
    this.logger.error(`Job fit ${job.data.analysisId} thất bại: ${error.message}`);
    await this.service.fail(job.data.analysisId, job.data.attempt, error.message);
  }
}
