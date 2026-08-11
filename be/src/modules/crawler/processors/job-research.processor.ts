import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { JobResearchService } from '../job-research.service';
import { JOB_RESEARCH_JOB, JOB_RESEARCH_QUEUE } from '../types/job-source.type';

@Processor(JOB_RESEARCH_QUEUE, {
  // Stall recovery: when a worker dies mid-crawl (OOM/kill), its locked job is
  // reclaimed and marked failed after a few stall checks instead of staying in
  // 'active' forever (maxStalledCount: 0 disabled that — intents were stuck in
  // 'processing' for hours with 0 matches and no Retry affordance).
  maxStalledCount: 3,
  stalledInterval: 60_000,
  maxStartedAttempts: 1,
})
export class JobResearchProcessor extends WorkerHost {
  private readonly logger = new Logger(JobResearchProcessor.name);

  constructor(private readonly jobResearchService: JobResearchService) {
    super();
  }

  async process(job: Job<{ intentId: string }>) {
    if (job.name !== JOB_RESEARCH_JOB) {
      this.logger.warn(`Bỏ qua job crawler không được hỗ trợ: ${job.name}`);
      return;
    }

    await this.jobResearchService.processIntent(job.data.intentId);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<{ intentId: string }> | undefined, error: Error) {
    if (!job?.data.intentId) return;

    this.logger.error(
      `Job research ${job.data.intentId} thất bại: ${error.message}`,
    );
    await this.jobResearchService.markWorkerFailure(
      job.data.intentId,
      error.message,
    );
  }
}
