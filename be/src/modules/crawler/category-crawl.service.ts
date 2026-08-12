import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';

import type { Env } from '../../config/env.schema';
import { AdminRealtimeGateway } from '../admin-realtime/admin-realtime.gateway';
import { JobCategory } from '../job-category/entities/job-category.entity';
import { SourceCategoryMapping } from '../job-category/entities/source-category-mapping.entity';
import { CrawlerApiConnector } from './connectors/crawler-api.connector';
import { CrawlNotifyService, type CategoryCrawlReport } from './crawl-notify.service';
import { CrawlerHttpService } from './crawler-http.service';
import { CategoryCrawlRunItem } from './entities/category-crawl-run-item.entity';
import { CategoryCrawlRun } from './entities/category-crawl-run.entity';
import { JobResearchService } from './job-research.service';
import { CATEGORY_CRAWL_JOB, CATEGORY_CRAWL_QUEUE, EXPIRED_JOB_CLEANUP_JOB, type CategoryCrawlJobData } from './types/category-crawl.type';
import { JobSource } from './types/job-source.type';

@Injectable()
export class CategoryCrawlService implements OnModuleInit {
  private readonly logger = new Logger(CategoryCrawlService.name);
  private readonly activeControllers = new Map<string, AbortController>();
  constructor(
    @InjectRepository(JobCategory) private readonly categories: Repository<JobCategory>,
    @InjectRepository(SourceCategoryMapping) private readonly mappings: Repository<SourceCategoryMapping>,
    @InjectRepository(CategoryCrawlRun) private readonly runs: Repository<CategoryCrawlRun>,
    @InjectRepository(CategoryCrawlRunItem) private readonly runItems: Repository<CategoryCrawlRunItem>,
    private readonly http: CrawlerHttpService,
    private readonly config: ConfigService<Env, true>,
    private readonly jobResearch: JobResearchService,
    @InjectQueue(CATEGORY_CRAWL_QUEUE) private readonly queue: Queue<CategoryCrawlJobData>,
    private readonly notify: CrawlNotifyService,
    private readonly realtime: AdminRealtimeGateway,
  ) {}

  async onModuleInit() { await this.reconcileActiveRuns(); await this.schedule(); }

  async trigger(forceRetry = false, triggeredByUserId?: string) {
    await this.reconcileActiveRuns();
    const active = await this.runs.findOne({ where: { status: In(['queued', 'processing']) }, order: { createdAt: 'DESC' } });
    if (active) {
      if (!forceRetry) return { run: this.toRun(active), enqueued: false, cancellation_requested: false };
      const job = active.bullJobId ? await this.queue.getJob(active.bullJobId) : null;
      const state = job ? await job.getState() : 'unknown';
      if (job && ['waiting', 'delayed', 'failed'].includes(state)) {
        await job.remove();
        await this.runs.update(active.id, { status: 'cancelled', phase: 'cancelled', progressMessage: 'Đã gỡ khỏi hàng đợi bởi quản trị viên.', cancelRequested: true, completedAt: new Date() });
        await this.emit(active.id);
      } else {
        await this.runs.update(active.id, { cancelRequested: true, phase: 'cancelling_retry', progressMessage: 'Đang dừng lượt hiện tại để chạy lại.' });
        this.activeControllers.get(active.id)?.abort(new Error('crawl_restart_requested'));
        await this.emit(active.id);
        return { run: this.toRun(await this.runs.findOneByOrFail({ id: active.id })), enqueued: false, cancellation_requested: true };
      }
    }

    const run = await this.runs.save(this.runs.create({
      triggerKey: `manual:${randomUUID()}`, triggerType: 'manual', triggeredByUserId: triggeredByUserId ?? null,
      status: 'queued', phase: 'queued', progress: 0, progressMessage: 'Đang chờ hệ thống xử lý.',
      totalTargets: 0, completedTargets: 0, failedTargets: 0, totalJobs: 0, savedJobs: 0,
      currentSource: null, currentCategory: null, cancelRequested: false, bullJobId: null,
      reportSnapshot: null, error: null, startedAt: null, completedAt: null,
    }));
    try {
      const job = await this.queue.add(CATEGORY_CRAWL_JOB, { runId: run.id }, {
        jobId: `category-crawl-${run.id}`, attempts: 1,
        removeOnComplete: { age: 60 * 60 * 24 * 7 }, removeOnFail: { age: 60 * 60 * 24 * 30 },
      });
      run.bullJobId = String(job.id);
      await this.runs.save(run);
      await this.emit(run.id);
      return { run: this.toRun(run), enqueued: true, cancellation_requested: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.runs.update(run.id, {
        status: 'failed', phase: 'failed', progressMessage: 'Không thể đưa tác vụ vào hàng đợi.',
        error: message, completedAt: new Date(),
      });
      await this.emit(run.id);
      throw error;
    }
  }

  async cancel(runId: string) {
    await this.reconcileActiveRuns();
    const run = await this.runs.findOneBy({ id: runId });
    if (!run) throw new BadRequestException('Lượt thu thập không tồn tại.');
    if (!['queued', 'processing'].includes(run.status)) return { run: this.toRun(run), cancellation_requested: false };
    const job = run.bullJobId ? await this.queue.getJob(run.bullJobId) : null;
    const state = job ? await job.getState() : 'unknown';
    if (job && ['waiting', 'delayed', 'failed'].includes(state)) {
      await job.remove();
      await this.runs.update(run.id, { status: 'cancelled', phase: 'cancelled', cancelRequested: true, progressMessage: 'Lượt thu thập đã được hủy.', completedAt: new Date() });
    } else {
      await this.runs.update(run.id, { cancelRequested: true, phase: 'cancelling', progressMessage: 'Đang dừng lượt thu thập.' });
      this.activeControllers.get(run.id)?.abort(new Error('crawl_cancelled'));
    }
    await this.emit(run.id);
    return { run: this.toRun(await this.runs.findOneByOrFail({ id: run.id })), cancellation_requested: true };
  }

  async createScheduledRun(timestamp: number) {
    await this.reconcileActiveRuns();
    const date = new Date(timestamp).toISOString().slice(0, 10);
    const triggerKey = `scheduled:${date}`;
    const existing = await this.runs.findOneBy({ triggerKey });
    if (existing) return existing.status === 'queued' ? existing.id : null;
    const active = await this.runs.findOne({ where: { status: In(['queued', 'processing']) } });
    if (active) {
      this.logger.warn(`Bỏ qua cron ${triggerKey}: run ${active.id} vẫn đang ${active.status}.`);
      return null;
    }
    const run = await this.runs.save(this.runs.create({
      triggerKey, triggerType: 'scheduled', triggeredByUserId: null, status: 'queued', phase: 'queued',
      progress: 0, progressMessage: 'Lịch tự động đã bắt đầu.', totalTargets: 0, completedTargets: 0,
      failedTargets: 0, totalJobs: 0, savedJobs: 0, currentSource: null, currentCategory: null,
      cancelRequested: false, bullJobId: `repeat:${triggerKey}`, reportSnapshot: null, error: null,
      startedAt: null, completedAt: null,
    }));
    await this.emit(run.id);
    return run.id;
  }

  async schedule() {
    const cron = this.config.get('CRAWL_CATEGORY_CRON', { infer: true });
    const repeatable = await this.queue.getRepeatableJobs();
    if (!repeatable.some((job) => job.name === CATEGORY_CRAWL_JOB)) {
      await this.queue.add(CATEGORY_CRAWL_JOB, { scheduled: true }, {
        jobId: 'category-crawl-schedule', repeat: { pattern: cron },
        removeOnComplete: { age: 60 * 60 * 24 * 7 }, removeOnFail: { age: 60 * 60 * 24 * 30 },
      });
      this.logger.log(`Đã lên lịch category crawl theo cron '${cron}'`);
    }
    if (!repeatable.some((job) => job.name === EXPIRED_JOB_CLEANUP_JOB)) {
      await this.queue.add(EXPIRED_JOB_CLEANUP_JOB, {}, {
        jobId: 'expired-job-cleanup-schedule', repeat: { pattern: '15 * * * *' },
        removeOnComplete: { age: 60 * 60 * 24 * 7 }, removeOnFail: { age: 60 * 60 * 24 * 30 },
      });
      this.logger.log('Đã lên lịch dọn việc làm hết hạn theo giờ.');
    }
  }

  deleteExpiredJobs() {
    return this.jobResearch.deleteExpiredJobs();
  }

  async run(runId: string) {
    const run = await this.runs.findOneBy({ id: runId });
    if (!run || !['queued', 'processing'].includes(run.status)) return;
    await this.runs.update(run.id, { status: 'processing', phase: 'preparing', progress: 2, progressMessage: 'Đang chuẩn bị danh sách nguồn và chuyên môn.', startedAt: run.startedAt ?? new Date(), error: null });
    await this.emit(run.id);
    const expiredDeleted = await this.jobResearch.deleteExpiredJobs();
    const categories = await this.categories.find({ where: { isActive: true }, relations: { aliases: true }, order: { groupCode: 'ASC', displayOrder: 'ASC' } });
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const enabledSources = this.config.get('CRAWL_CATEGORY_SOURCES', { infer: true }).split(',').map((value) => value.trim()).filter((value): value is JobSource => ['topcv', 'vietnamworks', 'itviec'].includes(value));
    const mappings = await this.mappings.find({ where: { isActive: true }, order: { source: 'ASC', id: 'ASC' } });
    const grouped = new Map<string, { source: JobSource; crawlUrl: string; expectedSourceLabel: string | null; categoryIds: string[] }>();
    for (const mapping of mappings) {
      if (!enabledSources.includes(mapping.source as JobSource) || !categoryById.has(mapping.categoryId)) continue;
      const key = `${mapping.source}\n${mapping.crawlUrl}`;
      const target = grouped.get(key) ?? { source: mapping.source as JobSource, crawlUrl: mapping.crawlUrl, expectedSourceLabel: mapping.externalName, categoryIds: [] };
      target.categoryIds.push(mapping.categoryId);
      grouped.set(key, target);
    }
    const targets = [...grouped.values()];
    await this.runItems.delete({ runId });
    const items = await this.runItems.save(targets.map((target) => this.runItems.create({
      runId, source: target.source, crawlUrl: target.crawlUrl, categoryIds: target.categoryIds,
      categoryNames: target.categoryIds.map((id) => categoryById.get(id)?.name).filter(Boolean).join(' / '),
      status: 'queued', fetchedCount: 0, savedCount: 0, durationMs: null, error: null, startedAt: null, completedAt: null,
    })));
    await this.runs.update(runId, { phase: 'crawling', progress: 5, progressMessage: `Đã chuẩn bị ${targets.length} mục. Đã xóa ${expiredDeleted} việc làm hết hạn.`, totalTargets: targets.length });
    await this.emit(runId);

    const errors: string[] = [];
    const perSourceCounts = new Map<string, number>();
    const perCategoryCounts = new Map<string, { name: string; count: number }>();
    let totalJobs = 0;
    let savedJobs = 0;
    let completed = 0;
    let failed = 0;
    const maxJobs = this.config.get('CRAWL_CATEGORY_MAX_JOBS_PER_SOURCE', { infer: true });

    for (let index = 0; index < targets.length; index += 1) {
      const currentRun = await this.runs.findOneByOrFail({ id: runId });
      if (currentRun.cancelRequested) {
        await this.completeCancellation(currentRun);
        return;
      }
      const target = targets[index];
      const item = items[index];
      const categoryNames = item.categoryNames;
      const startedAt = Date.now();
      const controller = new AbortController();
      this.activeControllers.set(runId, controller);
      await this.runItems.update(item.id, { status: 'processing', startedAt: new Date() });
      await this.runs.update(runId, { currentSource: target.source, currentCategory: categoryNames, progressMessage: `Đang thu thập ${target.source} · ${categoryNames}` });
      await this.emit(runId);
      try {
        const connector = new CrawlerApiConnector(target.source, this.http, this.config);
        const jobs = await connector.searchFixedCategory({
          categoryIds: target.categoryIds,
          categoryCandidates: Object.fromEntries(target.categoryIds.map((id) => {
            const category = categoryById.get(id)!;
            return [id, [category.name, ...category.aliases.map((alias) => alias.alias)]];
          })),
          crawlUrl: target.crawlUrl, expectedSourceLabel: target.expectedSourceLabel, maxJobs, signal: controller.signal,
        });
        const saved = await this.jobResearch.upsertCrawledJobs(jobs);
        totalJobs += jobs.length;
        savedJobs += saved;
        completed += 1;
        perSourceCounts.set(target.source, (perSourceCounts.get(target.source) ?? 0) + jobs.length);
        for (const job of jobs) {
          const category = job.categoryId ? categoryById.get(job.categoryId) : null;
          if (!category) continue;
          const entry = perCategoryCounts.get(category.id) ?? { name: category.name, count: 0 };
          entry.count += 1;
          perCategoryCounts.set(category.id, entry);
        }
        await this.runItems.update(item.id, { status: 'completed', fetchedCount: jobs.length, savedCount: saved, durationMs: Date.now() - startedAt, completedAt: new Date() });
      } catch (error) {
        const cancellingRun = await this.runs.findOneByOrFail({ id: runId });
        if (cancellingRun.cancelRequested) {
          await this.runItems.update(item.id, { status: 'cancelled', durationMs: Date.now() - startedAt, completedAt: new Date() });
          this.activeControllers.delete(runId);
          await this.completeCancellation(cancellingRun);
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${target.source} :: ${categoryNames}: ${message}`);
        failed += 1;
        await this.runItems.update(item.id, { status: 'failed', error: message, durationMs: Date.now() - startedAt, completedAt: new Date() });
      } finally {
        this.activeControllers.delete(runId);
      }
      const finished = completed + failed;
      await this.runs.update(runId, {
        completedTargets: completed, failedTargets: failed, totalJobs, savedJobs,
        progress: Math.min(95, 5 + Math.floor((finished / Math.max(targets.length, 1)) * 90)),
        progressMessage: `Đã xử lý ${finished}/${targets.length} mục.`,
      });
      await this.emit(runId);
      const afterTarget = await this.runs.findOneByOrFail({ id: runId });
      if (afterTarget.cancelRequested) {
        await this.completeCancellation(afterTarget);
        return;
      }
    }

    const report: CategoryCrawlReport = {
      runId, totalJobs, saved: savedJobs, errors,
      perSource: [...perSourceCounts.entries()].map(([source, count]) => ({ source, count })),
      perCategory: [...perCategoryCounts.entries()].map(([categoryId, entry]) => ({ categoryId, categoryName: entry.name, count: entry.count })),
    };
    await this.runs.update(runId, {
      status: failed === 0 ? 'completed' : completed > 0 ? 'partial_failed' : 'failed',
      phase: 'completed', progress: 100, progressMessage: failed === 0 ? 'Thu thập dữ liệu hoàn tất.' : `Đã hoàn tất với ${failed} mục bị lỗi.`,
      currentSource: null, currentCategory: null, reportSnapshot: report, error: errors.length ? errors.join('\n') : null, completedAt: new Date(),
    });
    await this.emit(runId);
    await this.notify.sendCategoryCrawlReport(report);
  }

  async failRun(runId: string, error: string) {
    const run = await this.runs.findOneBy({ id: runId });
    if (!run || !['queued', 'processing'].includes(run.status)) return;
    await this.runs.update(runId, { status: 'failed', phase: 'failed', progressMessage: 'Thu thập dữ liệu thất bại.', error, completedAt: new Date(), currentSource: null, currentCategory: null });
    await this.emit(runId);
  }

  async attachQueueJob(runId: string, bullJobId: string) {
    await this.runs.update(runId, { bullJobId });
  }

  async listRuns(page = 1, pageSize = 20) {
    const [items, total] = await this.runs.findAndCount({ order: { createdAt: 'DESC' }, skip: (page - 1) * pageSize, take: pageSize });
    return { items: items.map((item) => this.toRun(item)), meta: { page, page_size: pageSize, total, total_pages: Math.max(1, Math.ceil(total / pageSize)) } };
  }

  async getRun(id: string) {
    const run = await this.runs.findOneBy({ id });
    if (!run) throw new BadRequestException('Crawl run không tồn tại.');
    const items = await this.runItems.find({ where: { runId: id }, order: { createdAt: 'ASC' } });
    return { ...this.toRun(run), items: items.map((item) => ({ id: item.id, source: item.source, crawl_url: item.crawlUrl, category_ids: item.categoryIds, category_names: item.categoryNames, status: item.status, fetched_count: item.fetchedCount, saved_count: item.savedCount, duration_ms: item.durationMs, error: item.error, started_at: item.startedAt, completed_at: item.completedAt })) };
  }

  async getQueueOverview() {
    const [counts, repeatable, jobs] = await Promise.all([
      this.queue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed', 'paused'),
      this.queue.getRepeatableJobs(),
      this.queue.getJobs(['waiting', 'active', 'delayed', 'failed'], 0, 49, true),
    ]);
    return {
      counts,
      schedule: repeatable.map((item) => ({ key: item.key, name: item.name, pattern: item.pattern, next: item.next })),
      jobs: await Promise.all(jobs.map(async (job) => ({ id: String(job.id), name: job.name, state: await job.getState(), run_id: job.data.runId ?? null, scheduled: Boolean(job.data.scheduled), timestamp: job.timestamp, delay: job.delay, failed_reason: job.failedReason || null, attempts_made: job.attemptsMade }))),
    };
  }

  async removeQueueJob(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) throw new BadRequestException('Queue job không tồn tại.');
    const state = await job.getState();
    if (!['waiting', 'delayed', 'failed'].includes(state)) throw new BadRequestException(`Không thể gỡ job đang ở trạng thái ${state}.`);
    const runId = job.data.runId;
    await job.remove();
    if (runId) {
      await this.runs.update(runId, { status: state === 'failed' ? 'failed' : 'cancelled', phase: state === 'failed' ? 'failed' : 'cancelled', progressMessage: 'Queue job đã được gỡ bởi quản trị viên.', completedAt: new Date() });
      await this.emit(runId);
    }
    return { removed: true, job_id: jobId, previous_state: state };
  }

  private async reconcileActiveRuns() {
    const activeRuns = await this.runs.find({ where: { status: In(['queued', 'processing']) } });
    for (const run of activeRuns) {
      if (!run.bullJobId) {
        if (Date.now() - run.createdAt.getTime() < 30_000) continue;
        await this.runs.update(run.id, { status: 'failed', phase: 'failed', progressMessage: 'Tác vụ chưa được đưa vào hàng đợi.', error: 'queue_job_not_created', completedAt: new Date() });
        await this.emit(run.id);
        continue;
      }
      if (run.bullJobId.startsWith('repeat:')) continue;
      const job = await this.queue.getJob(run.bullJobId);
      const state = job ? await job.getState() : 'missing';
      if (['failed', 'completed', 'missing'].includes(state) && run.status !== 'completed') {
        await this.runs.update(run.id, { status: 'failed', phase: 'failed', progressMessage: 'Tác vụ đã dừng nhưng lượt chạy chưa hoàn tất.', error: job?.failedReason || `queue_job_${state}`, completedAt: new Date() });
        await this.emit(run.id);
      }
    }
  }

  private async emit(runId: string) {
    const run = await this.runs.findOneBy({ id: runId });
    if (!run) return;
    this.realtime.emitCrawlProgress({
      run_id: run.id, status: run.status, phase: run.phase, progress: run.progress,
      message: run.progressMessage, total_targets: run.totalTargets,
      completed_targets: run.completedTargets, failed_targets: run.failedTargets,
      total_jobs: run.totalJobs, saved_jobs: run.savedJobs, current_source: run.currentSource,
      current_category: run.currentCategory, updated_at: run.updatedAt,
      cancel_requested: run.cancelRequested,
    });
  }

  private async completeCancellation(run: CategoryCrawlRun) {
    const shouldRestart = run.phase === 'cancelling_retry';
    await this.runItems.createQueryBuilder().update(CategoryCrawlRunItem).set({ status: 'cancelled', completedAt: () => 'CURRENT_TIMESTAMP' }).where('run_id = :runId', { runId: run.id }).andWhere('status = :status', { status: 'queued' }).execute();
    await this.runs.update(run.id, { status: 'cancelled', phase: 'cancelled', progressMessage: shouldRestart ? 'Đã dừng lượt cũ, đang chuẩn bị chạy lại.' : 'Lượt thu thập đã được hủy.', currentSource: null, currentCategory: null, completedAt: new Date() });
    await this.emit(run.id);
    if (shouldRestart) await this.trigger(false, run.triggeredByUserId ?? undefined);
  }

  private toRun(run: CategoryCrawlRun) {
    return {
      id: run.id, trigger_key: run.triggerKey, trigger_type: run.triggerType,
      triggered_by_user_id: run.triggeredByUserId, status: run.status, phase: run.phase,
      progress: run.progress, progress_message: run.progressMessage, total_targets: run.totalTargets,
      completed_targets: run.completedTargets, failed_targets: run.failedTargets,
      total_jobs: run.totalJobs, saved_jobs: run.savedJobs, current_source: run.currentSource,
      current_category: run.currentCategory, cancel_requested: run.cancelRequested,
      bull_job_id: run.bullJobId, report: run.reportSnapshot, error: run.error,
      started_at: run.startedAt, completed_at: run.completedAt, created_at: run.createdAt, updated_at: run.updatedAt,
    };
  }
}
