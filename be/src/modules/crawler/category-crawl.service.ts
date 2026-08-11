import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';

import type { Env } from '../../config/env.schema';
import { JobCategory } from '../job-category/entities/job-category.entity';
import { SourceCategoryMapping } from '../job-category/entities/source-category-mapping.entity';
import { CrawlerApiConnector } from './connectors/crawler-api.connector';
import { CrawlNotifyService } from './crawl-notify.service';
import { CrawlerHttpService } from './crawler-http.service';
import { JobResearchService } from './job-research.service';
import { JobSource } from './types/job-source.type';
import {
  CATEGORY_CRAWL_JOB,
  CATEGORY_CRAWL_QUEUE,
} from './types/category-crawl.type';

@Injectable()
export class CategoryCrawlService implements OnModuleInit {
  private readonly logger = new Logger(CategoryCrawlService.name);

  constructor(
    @InjectRepository(JobCategory)
    private readonly categoryRepository: Repository<JobCategory>,
    @InjectRepository(SourceCategoryMapping)
    private readonly sourceCategoryMappingRepository: Repository<SourceCategoryMapping>,
    private readonly http: CrawlerHttpService,
    private readonly config: ConfigService<Env, true>,
    private readonly jobResearchService: JobResearchService,
    @InjectQueue(CATEGORY_CRAWL_QUEUE)
    private readonly queue: Queue<{ runId: string }>,
    private readonly notify: CrawlNotifyService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.schedule();
  }

  /**
   * Trigger một đợt category crawl ngay lập tức (thủ công / API).
   * Chỉ cho phép 1 job mỗi ngày: jobId cố định theo ngày, trả về ngay nếu
   * job đó đã tồn tại (waiting/active/delayed) thay vì chạy song song.
   * Khi forceRetry=true, gỡ job cùng ngày trước khi enqueue lại.
   */
  async trigger(
    forceRetry = false,
  ): Promise<{ runId: string; enqueued: boolean }> {
    const date = new Date().toISOString().slice(0, 10);
    const runId = `category-crawl-${date}`;
    const jobId = `category-crawl-run-${date}`;
    const existing = await this.queue.getJob(jobId);

    if (existing) {
      const state = await existing.getState();

      // Job đã failed (ví dụ worker chết giữa chừng) → xóa để cho phép chạy
      // lại cùng ngày thay vì chặn vĩnh viễn. Data đã upsert idempotent nên
      // chạy lại an toàn.
      if (state !== 'failed' && !forceRetry) {
        return { runId, enqueued: false };
      }

      await existing.remove();
      if (forceRetry) {
        this.logger.log(
          `Đã gỡ category crawl cũ để chạy lại: ${runId} (${state})`,
        );
      }
    }

    await this.queue.add(
      CATEGORY_CRAWL_JOB,
      { runId },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: { age: 60 * 60 * 24 * 7 },
        removeOnFail: { age: 60 * 60 * 24 * 7 },
      },
    );

    this.logger.log(`Đã kích hoạt category crawl: ${runId}`);
    return { runId, enqueued: true };
  }

  async schedule(): Promise<void> {
    const cron = this.config.get('CRAWL_CATEGORY_CRON', { infer: true });
    const exists = await this.queue.getRepeatableJobs();

    for (const job of exists) {
      if (job.name === CATEGORY_CRAWL_JOB) {
        return;
      }
    }

    await this.queue.add(
      CATEGORY_CRAWL_JOB,
      { runId: `category-crawl-${Date.now()}` },
      {
        jobId: 'category-crawl-schedule',
        repeat: { pattern: cron },
        removeOnComplete: { age: 60 * 60 * 24 * 7 },
        removeOnFail: { age: 60 * 60 * 24 * 7 },
      },
    );
    this.logger.log(`Đã lên lịch category crawl theo cron '${cron}'`);
  }

  async run(runId: string): Promise<{
    categories: number;
    saved: number;
    errors: string[];
  }> {
    const expiredDeleted = await this.jobResearchService.deleteExpiredJobs();
    if (expiredDeleted > 0) {
      this.logger.log(
        `[category-crawl] đã xóa ${expiredDeleted} job hết hạn trước khi crawl`,
      );
    }
    const categories = await this.categoryRepository.find({
      where: { isActive: true },
      relations: { aliases: true },
      order: { groupCode: 'ASC', displayOrder: 'ASC' },
    });

    const sources = this.config
      .get('CRAWL_CATEGORY_SOURCES', { infer: true })
      .split(',')
      .map((source) => source.trim())
      .filter((source): source is JobSource =>
        ['topcv', 'vietnamworks', 'itviec'].includes(source),
      );

    const maxJobsPerSource = this.config.get(
      'CRAWL_CATEGORY_MAX_JOBS_PER_SOURCE',
      { infer: true },
    );

    let saved = 0;
    const errors: string[] = [];
    const perSourceCounts = new Map<string, number>();
    const perCategoryCounts = new Map<
      string | null,
      { name: string; count: number }
    >();
    const categoryById = new Map(
      categories.map((category) => [category.id, category]),
    );
    const mappings = await this.sourceCategoryMappingRepository.find({
      where: { isActive: true },
      order: { source: 'ASC', id: 'ASC' },
    });
    const eligibleMappings = mappings.filter(
      (mapping) =>
        sources.includes(mapping.source as JobSource) &&
        categoryById.has(mapping.categoryId),
    );
    const groupedTargets = new Map<
      string,
      {
        source: JobSource;
        crawlUrl: string;
        expectedSourceLabel: string | null;
        categoryIds: string[];
      }
    >();
    for (const mapping of eligibleMappings) {
      const key = `${mapping.source}\n${mapping.crawlUrl}`;
      const target = groupedTargets.get(key) ?? {
        source: mapping.source as JobSource,
        crawlUrl: mapping.crawlUrl,
        expectedSourceLabel: mapping.externalName,
        categoryIds: [],
      };
      target.categoryIds.push(mapping.categoryId);
      groupedTargets.set(key, target);
    }
    const targets = [...groupedTargets.values()];

    for (const target of targets) {
      const source = target.source;
      const categoryNames = target.categoryIds
        .map((id) => categoryById.get(id)!.name)
        .join(' / ');
      const startedAt = Date.now();
      try {
        const connector = new CrawlerApiConnector(
          source,
          this.http,
          this.config,
        );
        const jobs = await connector.searchFixedCategory({
          categoryIds: target.categoryIds,
          categoryCandidates: Object.fromEntries(
            target.categoryIds.map((id) => {
              const category = categoryById.get(id)!;
              return [
                id,
                [
                  category.name,
                  ...category.aliases.map((alias) => alias.alias),
                ],
              ];
            }),
          ),
          crawlUrl: target.crawlUrl,
          expectedSourceLabel: target.expectedSourceLabel,
          maxJobs: maxJobsPerSource,
        });
        saved += await this.jobResearchService.upsertCrawledJobs(jobs);
        perSourceCounts.set(
          source,
          (perSourceCounts.get(source) ?? 0) + jobs.length,
        );
        for (const job of jobs) {
          const category = job.categoryId
            ? categoryById.get(job.categoryId)
            : undefined;
          if (!category) continue;
          const entry = perCategoryCounts.get(category.id) ?? {
            name: category.name,
            count: 0,
          };
          entry.count += 1;
          perCategoryCounts.set(category.id, entry);
        }
        this.logger.log(
          `[category-crawl] ${source} :: ${categoryNames}: ${jobs.length} việc làm trong ${Date.now() - startedAt}ms`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${source} :: ${categoryNames}: ${message}`);
        this.logger.warn(
          `[category-crawl] ${source} :: ${categoryNames} thất bại: ${message}`,
        );
      }
    }

    this.logger.log(
      `[category-crawl] xong: ${targets.length} trang ngành / ${categories.length} category, đã lưu ${saved}, ${errors.length} lỗi`,
    );

    const totalJobs = [...perSourceCounts.values()].reduce(
      (sum, count) => sum + count,
      0,
    );

    await this.notify.sendCategoryCrawlReport({
      runId,
      totalJobs,
      saved,
      errors,
      perSource: [...perSourceCounts.entries()].map(([source, count]) => ({
        source,
        count,
      })),
      perCategory: [...perCategoryCounts.entries()].map(
        ([categoryId, entry]) => ({
          categoryId,
          categoryName: entry.name,
          count: entry.count,
        }),
      ),
    });

    return { categories: categories.length, saved, errors };
  }
}
