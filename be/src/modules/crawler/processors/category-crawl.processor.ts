import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { CategoryCrawlService } from '../category-crawl.service';
import {
  CATEGORY_CRAWL_JOB,
  CATEGORY_CRAWL_QUEUE,
  EXPIRED_JOB_CLEANUP_JOB,
  type CategoryCrawlJobData,
} from '../types/category-crawl.type';

@Processor(CATEGORY_CRAWL_QUEUE, {
  // Stall recovery: job crawl chạy 15-45 phút, worker chết giữa chừng
  // (OOM/kill/restart) sẽ làm job rơi vào 'active' quá lockDuration. Với
  // maxStalledCount > 1, BullMQ tự đưa job trở lại hàng đợi để worker mới
  // chạy lại (upsert idempotent nên chạy lại an toàn) thay vì fail vĩnh viễn.
  maxStalledCount: 3,
  stalledInterval: 60_000,
  lockDuration: 120_000,
  maxStartedAttempts: 1,
})
export class CategoryCrawlProcessor extends WorkerHost {
  private readonly logger = new Logger(CategoryCrawlProcessor.name);

  constructor(private readonly categoryCrawlService: CategoryCrawlService) {
    super();
  }

  async process(job: Job<CategoryCrawlJobData>) {
    if (job.name === EXPIRED_JOB_CLEANUP_JOB) {
      return { deleted: await this.categoryCrawlService.deleteExpiredJobs() };
    }
    if (job.name !== CATEGORY_CRAWL_JOB) {
      this.logger.warn(
        `Bỏ qua job category crawl không được hỗ trợ: ${job.name}`,
      );
      return;
    }

    const runId = job.data.scheduled
      ? await this.categoryCrawlService.createScheduledRun(job.timestamp)
      : job.data.runId;
    if (runId) {
      await job.updateData({ ...job.data, runId });
      await this.categoryCrawlService.attachQueueJob(runId, String(job.id));
      await this.categoryCrawlService.run(runId);
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<CategoryCrawlJobData> | undefined, error: Error) {
    this.logger.error(
      `Category crawl thất bại: ${error.message}${
        job?.data?.runId ? ` (run ${job.data.runId})` : ''
      }`,
    );
    if (job?.data.runId) {
      await this.categoryCrawlService.failRun(job.data.runId, error.message);
    }
  }
}
