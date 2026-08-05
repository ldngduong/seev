import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { CvService } from '../cv.service';
import { ResearchProgressService } from '../../research-realtime/research-progress.service';
import {
  CV_RESEARCH_JOB,
  CV_RESEARCH_QUEUE,
  type CvResearchJobData,
} from '../types/cv-research-queue.type';

@Processor(CV_RESEARCH_QUEUE, {
  maxStalledCount: 0,
  maxStartedAttempts: 1,
})
export class CvResearchProcessor extends WorkerHost {
  private readonly logger = new Logger(CvResearchProcessor.name);

  constructor(
    private readonly cvService: CvService,
    private readonly progressService: ResearchProgressService,
  ) {
    super();
  }

  async process(job: Job<CvResearchJobData>) {
    if (job.name !== CV_RESEARCH_JOB) {
      this.logger.warn(`Ignored unsupported CV research job: ${job.name}`);
      return;
    }

    await this.cvService.processResearchSession(
      job.data.sessionId,
      job.data.attempt,
    );
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<CvResearchJobData> | undefined, error: Error) {
    const sessionId = job?.data.sessionId;
    if (!sessionId) return;

    this.logger.error(`CV research ${sessionId} failed: ${error.message}`);
    await this.progressService.fail(sessionId, job.data.attempt, error.message);
  }
}
