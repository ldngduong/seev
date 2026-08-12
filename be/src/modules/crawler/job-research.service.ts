import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Brackets, In, Repository } from 'typeorm';

import type { Env } from '../../config/env.schema';
import { runWithConcurrency } from '../../shared/utils/run-with-concurrency';
import { CvResearchSession } from '../cv/entities/cv-research-session.entity';
import { CvAudit } from '../cv/entities/cv-audit.entity';
import { CategorySeniorityLevel } from '../job-category/entities/category-seniority-level.entity';
import { JobCategory } from '../job-category/entities/job-category.entity';
import { SeniorityLevel } from '../seniority/entities/seniority-level.entity';
import { ResearchProgressService } from '../research-realtime/research-progress.service';
import { CreateJobResearchIntentDto } from './dto/create-job-research-intent.dto';
import { JobFeedQueryDto } from './dto/job-feed-query.dto';
import { JobCrawlRun } from './entities/job-crawl-run.entity';
import { AiEngineService } from '../ai/ai-engine.service';
import { JobIntentMatch } from './entities/job-intent-match.entity';
import { JobPost } from './entities/job-post.entity';
import { JobPostSeniorityLevel } from './entities/job-post-seniority-level.entity';
import { JobSearchIntent } from './entities/job-search-intent.entity';
import type {
  CrawledJob,
  JobSearchIntentPayload,
} from './types/crawled-job.type';
import {
  JOB_RESEARCH_JOB,
  JOB_RESEARCH_QUEUE,
  JOB_SOURCES,
  type JobSource,
} from './types/job-source.type';
import { createContentHash } from './utils/content-hash';
import {
  clamp,
  normalizeSearchText,
  normalizeText,
  uniqueNonEmpty,
} from './utils/text-normalizer';
import { resolveSeniorityGroup } from './utils/seniority-intent';

interface CreateIntentResult {
  intent: JobSearchIntent;
  queueJobId: string | number | undefined;
}

@Injectable()
export class JobResearchService {
  constructor(
    @InjectQueue(JOB_RESEARCH_QUEUE)
    private readonly queue: Queue<{ intentId: string }>,
    @InjectRepository(JobSearchIntent)
    private readonly intentRepository: Repository<JobSearchIntent>,
    @InjectRepository(JobCrawlRun)
    private readonly crawlRunRepository: Repository<JobCrawlRun>,
    @InjectRepository(JobPost)
    private readonly jobPostRepository: Repository<JobPost>,
    @InjectRepository(JobPostSeniorityLevel)
    private readonly jobPostSeniorityRepository: Repository<JobPostSeniorityLevel>,
    @InjectRepository(JobIntentMatch)
    private readonly matchRepository: Repository<JobIntentMatch>,
    @InjectRepository(CvResearchSession)
    private readonly researchSessionRepository: Repository<CvResearchSession>,
    @InjectRepository(CvAudit)
    private readonly auditRepository: Repository<CvAudit>,
    @InjectRepository(JobCategory)
    private readonly categoryRepository: Repository<JobCategory>,
    @InjectRepository(SeniorityLevel)
    private readonly seniorityRepository: Repository<SeniorityLevel>,
    @InjectRepository(CategorySeniorityLevel)
    private readonly categorySeniorityRepository: Repository<CategorySeniorityLevel>,
    private readonly config: ConfigService<Env, true>,
    private readonly progressService: ResearchProgressService,
    private readonly aiEngine: AiEngineService,
  ) {}

  async deleteExpiredJobs(): Promise<number> {
    const result = await this.jobPostRepository
      .createQueryBuilder()
      .delete()
      .where('expired_at <= NOW()')
      .execute();
    return result.affected ?? 0;
  }

  async listJobFeed(query: JobFeedQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 18;
    const builder = this.jobPostRepository
      .createQueryBuilder('job')
      .where('job.expired_at > NOW()');

    const search = query.search?.trim();
    if (search) {
      builder.andWhere(
        '(job.title ILIKE :search OR job.company_name ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (query.categoryId) {
      builder.andWhere('job.job_category_id = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.seniorityLevelId) {
      builder.andWhere(
        `EXISTS (
          SELECT 1 FROM job_post_seniority_levels feed_seniority
          WHERE feed_seniority.job_post_id = job.id
            AND feed_seniority.seniority_level_id = :seniorityLevelId
        )`,
        { seniorityLevelId: query.seniorityLevelId },
      );
    }

    builder
      .orderBy('job.posted_at', 'DESC', 'NULLS LAST')
      .addOrderBy('job.last_seen_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [jobs, total] = await builder.getManyAndCount();
    const seniorityRows: Array<{
      jobPostId: string;
      id: string;
      code: string;
      displayName: string;
    }> = jobs.length
      ? await this.jobPostRepository.query(
          `SELECT jsl."job_post_id" AS "jobPostId",
                  sl."id", sl."code", sl."display_name" AS "displayName"
             FROM "job_post_seniority_levels" jsl
             JOIN "seniority_levels" sl ON sl."id" = jsl."seniority_level_id"
            WHERE jsl."job_post_id" = ANY($1::uuid[])
            ORDER BY jsl."is_primary" DESC, jsl."confidence" DESC`,
          [jobs.map((job) => job.id)],
        )
      : [];
    const seniorityByJob = new Map<
      string,
      Array<{ id: string; code: string; displayName: string }>
    >();
    for (const row of seniorityRows) {
      seniorityByJob.set(row.jobPostId, [
        ...(seniorityByJob.get(row.jobPostId) ?? []),
        { id: row.id, code: row.code, displayName: row.displayName },
      ]);
    }

    return {
      items: jobs.map((job) => ({
        ...job,
        seniorityLevels: seniorityByJob.get(job.id) ?? [],
      })),
      meta: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize),
      },
    };
  }

  async createIntent(
    dto: CreateJobResearchIntentDto,
    userId: string,
    options: {
      researchSessionId?: string;
      researchSessionAttempt?: number;
    } = {},
  ): Promise<CreateIntentResult> {
    if (options.researchSessionId) {
      const existingIntent = await this.intentRepository.findOneBy({
        researchSessionId: options.researchSessionId,
        userId,
      });

      if (existingIntent) {
        return {
          intent: existingIntent,
          queueJobId: undefined,
        };
      }
    }

    const resolved = await this.resolveIntent(dto, userId);
    const intent = await this.intentRepository.save(
      this.intentRepository.create({
        ...resolved,
        researchSessionId: options.researchSessionId ?? null,
        researchSessionAttempt: options.researchSessionAttempt ?? null,
        status: 'queued',
        completedSources: [],
        totalJobs: 0,
        error: null,
      }),
    );
    const queueJob = await this.queue.add(
      JOB_RESEARCH_JOB,
      { intentId: intent.id },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: { age: 86400, count: 1000 },
      },
    );

    return {
      intent,
      queueJobId: queueJob.id,
    };
  }

  async processIntent(intentId: string) {
    const intent = await this.intentRepository.findOneBy({ id: intentId });

    if (!intent) {
      throw new NotFoundException('Intent tìm việc không tồn tại.');
    }

    await this.intentRepository.update(intent.id, {
      status: 'processing',
      error: null,
    });
    await this.matchRepository.delete({ intentId: intent.id });

    if (intent.researchSessionId) {
      await this.progressService.update(
        intent.researchSessionId,
        {
          status: 'processing',
          phase: 'job_matching',
          progress: 76,
          message: 'Đang tìm việc làm phù hợp với CV của bạn.',
        },
        intent.researchSessionAttempt ?? undefined,
      );
    }

    try {
      const payload = this.toPayload(intent);
      const dbJobs = await this.findDbJobsForIntent(intent, payload.sources);
      let finishedSources = 0;
      const sourceResults = await runWithConcurrency(
        payload.sources,
        this.config.get('JOB_RESEARCH_SOURCE_CONCURRENCY', { infer: true }),
        async (source) => {
          const run = await this.startRun(intent, source, payload);
          const jobsOfSource = dbJobs.filter((job) => job.source === source);

          try {
            const savedCount = await this.saveDbMatches(intent, jobsOfSource);
            await this.completeRun(run, jobsOfSource.length, savedCount);
            return {
              source,
              savedCount,
              completed: true,
              error: null,
            };
          } catch (error) {
            const message = this.formatError(error);
            await this.failRun(run, message);
            return {
              source,
              savedCount: 0,
              completed: false,
              error: message,
            };
          } finally {
            finishedSources += 1;
            if (intent.researchSessionId) {
              await this.progressService.update(
                intent.researchSessionId,
                {
                  phase: 'job_matching',
                  progress:
                    76 +
                    Math.floor((finishedSources / payload.sources.length) * 19),
                  message:
                    'Đang đối chiếu việc làm với kinh nghiệm và cấp bậc của bạn.',
                },
                intent.researchSessionAttempt ?? undefined,
              );
            }
          }
        },
      );
      const completedSources = sourceResults
        .filter((result) => result.completed)
        .map((result) => result.source);
      const errors = sourceResults
        .filter((result) => result.error)
        .map((result) => `${result.source}: ${result.error}`);
      const totalJobs = sourceResults.reduce(
        (total, result) => total + result.savedCount,
        0,
      );

      await this.intentRepository.update(intent.id, {
        status: completedSources.length > 0 ? 'completed' : 'failed',
        completedSources,
        totalJobs,
        error: errors.length > 0 ? errors.join('\n') : null,
      });

      await this.snapshotResearchSessionJobs(intent.id);
    } catch (error) {
      await this.intentRepository.update(intent.id, {
        status: 'failed',
        error: this.formatError(error),
      });
      await this.snapshotResearchSessionJobs(intent.id);
      throw error;
    }

    return this.buildIntentResponse(intent.id);
  }

  async listUserIntents(userId: string, limit = 30) {
    const safeLimit = clamp(limit, 1, 100);
    const intents = await this.intentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: safeLimit,
    });

    if (intents.length === 0) {
      return [];
    }

    const runs = await this.crawlRunRepository.find({
      where: { intentId: In(intents.map((intent) => intent.id)) },
      order: { createdAt: 'ASC' },
    });
    const runsByIntent = new Map<string, JobCrawlRun[]>();

    for (const run of runs) {
      runsByIntent.set(run.intentId, [
        ...(runsByIntent.get(run.intentId) ?? []),
        run,
      ]);
    }

    return intents.map((intent) => ({
      ...intent,
      runs: runsByIntent.get(intent.id) ?? [],
    }));
  }

  async getIntent(intentId: string, userId: string) {
    await this.findUserIntentOrThrow(intentId, userId);
    return this.buildIntentResponse(intentId);
  }

  async retryIntent(intentId: string, userId: string) {
    const intent = await this.findUserIntentOrThrow(intentId, userId);

    await this.crawlRunRepository
      .createQueryBuilder()
      .update(JobCrawlRun)
      .set({
        status: 'failed',
        completedAt: () => 'CURRENT_TIMESTAMP',
        error: 'Bị thay thế bởi lần chạy lại sau khi job queue trước dừng.',
      })
      .where('intent_id = :intentId', { intentId: intent.id })
      .andWhere('status IN (:...statuses)', {
        statuses: ['queued', 'processing'],
      })
      .execute();

    await this.intentRepository.update(intent.id, {
      status: 'queued',
      completedSources: [],
      totalJobs: 0,
      error: null,
    });

    const queueJob = await this.queue.add(
      JOB_RESEARCH_JOB,
      { intentId: intent.id },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: { age: 86400, count: 1000 },
      },
    );

    return {
      intent: await this.buildIntentResponse(intent.id),
      queueJobId: queueJob.id,
    };
  }

  async markWorkerFailure(intentId: string, error: string) {
    const intent = await this.intentRepository.findOneBy({ id: intentId });
    if (!intent || ['completed', 'failed'].includes(intent.status)) return;

    await this.intentRepository.update(intent.id, {
      status: 'failed',
      error,
    });

    if (intent.researchSessionId && intent.researchSessionAttempt) {
      await this.progressService.fail(
        intent.researchSessionId,
        intent.researchSessionAttempt,
        error,
      );
    }
  }

  private async buildIntentResponse(intentId: string) {
    const intent = await this.findIntentOrThrow(intentId);

    const runs = await this.crawlRunRepository.find({
      where: { intentId },
      order: { createdAt: 'ASC' },
    });

    return {
      ...intent,
      runs,
    };
  }

  async getIntentJobs(intentId: string, userId: string, limit?: number) {
    await this.findUserIntentOrThrow(intentId, userId);
    const query = this.matchRepository
      .createQueryBuilder('match')
      .innerJoinAndSelect('match.jobPost', 'job')
      .where('match.intent_id = :intentId', { intentId })
      .andWhere("match.match_kind != 'reject'")
      .orderBy('match.match_score', 'DESC')
      .addOrderBy("CASE match.match_kind WHEN 'match' THEN 0 ELSE 1 END", 'ASC')
      .addOrderBy('job.last_seen_at', 'DESC');

    if (limit !== undefined) {
      query.limit(clamp(limit, 1, 100));
    }

    const rows = await query.getMany();

    return rows.map((match) => ({
      match_score: match.matchScore,
      matched_terms: match.matchedTerms,
      match_kind: match.matchKind,
      match_reason: match.matchReason,
      job: match.jobPost,
    }));
  }

  private async resolveIntent(dto: CreateJobResearchIntentDto, userId: string) {
    const audit = dto.auditId
      ? await this.auditRepository.findOneBy({ id: dto.auditId, userId })
      : null;

    if (dto.auditId && !audit) {
      throw new NotFoundException('Bản audit CV không tồn tại.');
    }

    const categoryId = dto.jobCategoryId ?? audit?.jobCategoryId ?? undefined;
    const seniorityId =
      dto.seniorityLevelId ?? audit?.seniorityLevelId ?? undefined;
    const [category, seniority] = await Promise.all([
      categoryId ? this.categoryRepository.findOneBy({ id: categoryId }) : null,
      seniorityId
        ? this.seniorityRepository.findOneBy({
            id: seniorityId,
            isActive: true,
          })
        : null,
    ]);

    if (categoryId && !category) {
      throw new BadRequestException('Ngành nghề đã chọn không tồn tại.');
    }

    if (seniorityId && !seniority) {
      throw new BadRequestException('Cấp bậc đã chọn không tồn tại.');
    }

    if (category && seniority) {
      const compatible = await this.categorySeniorityRepository.existsBy({
        categoryId: category.id,
        seniorityCode: seniority.code,
        isSelectable: true,
      });

      if (!compatible) {
        throw new BadRequestException(
          `Cấp bậc ${seniority.displayName} không phù hợp với nhóm ${category.name}.`,
        );
      }
    }

    const targetRole = normalizeText(
      dto.targetRole || audit?.targetRole || undefined,
    );
    const jobCategoryName = normalizeText(
      category?.name || audit?.jobCategoryName || undefined,
    );
    const seniorityLevelName = normalizeText(
      seniority?.name ||
        dto.seniorityLevelName ||
        audit?.seniorityLevelName ||
        undefined,
    );
    const keywords = uniqueNonEmpty([
      ...(dto.keywords ?? []),
      jobCategoryName,
      targetRole,
      ...this.extractAuditKeywords(audit),
    ]).filter(
      (keyword) =>
        !this.isRoleLikeKeyword(keyword, targetRole, dto.searchQueries ?? []),
    );
    const searchQueries = uniqueNonEmpty(dto.searchQueries ?? []);

    if (!jobCategoryName && !targetRole && keywords.length === 0) {
      throw new BadRequestException(
        'Research việc làm cần có audit, vị trí mục tiêu, ngành nghề hoặc từ khóa.',
      );
    }

    return {
      userId,
      auditId: audit?.id ?? null,
      targetRole: targetRole || null,
      jobCategoryId: category?.id ?? audit?.jobCategoryId ?? null,
      jobCategoryName: jobCategoryName || null,
      seniorityLevelId: seniority?.id ?? audit?.seniorityLevelId ?? null,
      seniorityLevelName: seniorityLevelName || null,
      keywords,
      searchQueries,
      locations: uniqueNonEmpty(dto.locations ?? []),
      requestedSources: this.resolveSources(dto.sources),
      maxJobsPerSource:
        dto.maxJobsPerSource ??
        this.config.get('JOB_RESEARCH_MAX_JOBS_PER_SOURCE', { infer: true }),
    };
  }

  private extractAuditKeywords(audit: CvAudit | null) {
    if (!audit?.suggestedKeywords) {
      return [];
    }

    return audit.suggestedKeywords.slice(0, 12);
  }

  /**
   * Drop keyword entries that are actually role titles or carry seniority
   * wording: level is tracked separately and role titles pollute skill
   * matching. Pure data cleaning, not scoring.
   */
  private isRoleLikeKeyword(
    keyword: string,
    targetRole: string | null,
    searchQueries: string[],
  ) {
    const normalized = normalizeSearchText(keyword);
    const roleMatches =
      !!targetRole && normalized === normalizeSearchText(targetRole);
    const queryMatches = searchQueries.some(
      (query) => normalized === normalizeSearchText(query),
    );
    const seniorityPhrases = resolveSeniorityGroup(keyword);

    return roleMatches || queryMatches || seniorityPhrases !== null;
  }

  private resolveSources(sources: JobSource[] | undefined) {
    const requested =
      sources && sources.length > 0
        ? sources
        : this.config
            .get('JOB_RESEARCH_DEFAULT_SOURCES', { infer: true })
            .split(',')
            .map((source) => source.trim());

    return requested.filter((source): source is JobSource =>
      JOB_SOURCES.includes(source as JobSource),
    );
  }

  private toPayload(intent: JobSearchIntent): JobSearchIntentPayload {
    return {
      intentId: intent.id,
      auditId: intent.auditId,
      targetRole: intent.targetRole,
      jobCategoryId: intent.jobCategoryId,
      jobCategoryName: intent.jobCategoryName,
      seniorityLevelId: intent.seniorityLevelId,
      seniorityLevelName: intent.seniorityLevelName,
      keywords: intent.keywords,
      searchQueries: intent.searchQueries,
      locations: intent.locations,
      sources: intent.requestedSources,
      maxJobsPerSource: intent.maxJobsPerSource,
    };
  }

  private async findIntentOrThrow(intentId: string) {
    const intent = await this.intentRepository.findOneBy({ id: intentId });

    if (!intent) {
      throw new NotFoundException('Intent tìm việc không tồn tại.');
    }

    return intent;
  }

  private async findUserIntentOrThrow(intentId: string, userId: string) {
    const intent = await this.intentRepository.findOneBy({
      id: intentId,
      userId,
    });

    if (!intent) {
      throw new NotFoundException('Intent tìm việc không tồn tại.');
    }

    return intent;
  }

  private async startRun(
    intent: JobSearchIntent,
    source: JobSource,
    payload: JobSearchIntentPayload,
  ) {
    return this.crawlRunRepository.save(
      this.crawlRunRepository.create({
        intentId: intent.id,
        source,
        status: 'processing',
        query: {
          targetRole: payload.targetRole,
          jobCategoryName: payload.jobCategoryName,
          seniorityLevelName: payload.seniorityLevelName,
          keywords: payload.keywords,
          searchQueries: payload.searchQueries,
          locations: payload.locations,
        },
        startedAt: new Date(),
        error: null,
      }),
    );
  }

  private async completeRun(
    run: JobCrawlRun,
    fetchedCount: number,
    savedCount: number,
  ) {
    await this.crawlRunRepository.update(run.id, {
      status: 'completed',
      fetchedCount,
      savedCount,
      completedAt: () => 'CURRENT_TIMESTAMP',
      error: null,
    });
  }

  private async failRun(run: JobCrawlRun, error: string) {
    await this.crawlRunRepository.update(run.id, {
      status: 'failed',
      error,
      completedAt: () => 'CURRENT_TIMESTAMP',
    });
  }

  /**
   * Đọc job để gợi ý trực tiếp từ job_posts (được category crawl đổ đầy),
   * thay cho live crawl. Filter: source, category (root -> children + root,
   * leaf -> chính nó; fallback theo tên cho data cũ thiếu id), thành phố
   * (so khớp mềm trên jsonb locations), keyword (search_text, OR giữa các
   * term, ưu tiên job khớp nhiều term), seniority (xếp hạng mềm: job đúng
   * cấp lên đầu, AI classify cắt sau).
   */
  private async findDbJobsForIntent(
    intent: JobSearchIntent,
    sources: JobSource[],
  ) {
    const qb = this.jobPostRepository
      .createQueryBuilder('job')
      .where('job.search_text IS NOT NULL')
      .andWhere('job.expired_at > NOW()')
      .andWhere('job.source IN (:...sources)', { sources });

    // 1) canonical IT category: every selectable category is a concrete leaf.
    if (intent.jobCategoryId) {
      qb.andWhere('job.job_category_id = :categoryId', {
        categoryId: intent.jobCategoryId,
      });
    }

    // 2) thành phố: so khớp mềm trên jsonb locations (bỏ dấu 2 chiều)
    const city = normalizeSearchText(intent.locations[0] ?? '');
    if (city.length >= 3) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM jsonb_array_elements_text(job.locations) AS loc
           WHERE translate(lower(loc),
             'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ',
             'aaaaaaaaaaaaaaaaaaaaaaaaaeeeeeeeeeeeeeiiiiioooooooooooooooooooouuuuuuuuuuuuuuyyyyyyd')
           LIKE :cityLike)`,
        { cityLike: `%${city}%` },
      );
    }

    // 3) keyword: targetRole + keywords, OR giữa các term, điểm = số term khớp
    const terms = uniqueNonEmpty([
      intent.targetRole,
      ...(intent.keywords ?? []),
    ])
      .flatMap((term) => normalizeSearchText(term).split(/\s+/))
      .filter((term) => term.length >= 3);

    if (terms.length > 0) {
      const params: Record<string, string> = {};
      const likeClauses = terms.map((term, index) => {
        params[`kw${index}`] = `%${term}%`;
        return `job.search_text LIKE :kw${index}`;
      });
      qb.andWhere(`(${likeClauses.join(' OR ')})`, params).addSelect(
        `(${terms
          .map(
            (_, index) =>
              `CASE WHEN job.search_text LIKE :kw${index} THEN 1 ELSE 0 END`,
          )
          .join(' + ')})`,
        'kw_score',
      );
    }

    // 4) seniority: xếp hạng mềm (job đúng cấp lên đầu), AI cắt sau
    if (intent.seniorityLevelId) {
      qb.addSelect(
        `CASE WHEN EXISTS (
          SELECT 1 FROM job_post_seniority_levels jsl
          WHERE jsl.job_post_id = job.id AND jsl.seniority_level_id = :seniorityId
        ) THEN 0 ELSE 1 END`,
        'sen_rank',
      ).setParameter('seniorityId', intent.seniorityLevelId);
    }

    if (terms.length > 0) {
      qb.addOrderBy('kw_score', 'DESC');
    }
    if (intent.seniorityLevelId) {
      qb.addOrderBy('sen_rank', 'ASC');
    }
    qb.addOrderBy('job.posted_at', 'DESC')
      .addOrderBy('job.last_seen_at', 'DESC')
      .take(clamp(intent.maxJobsPerSource * sources.length, 1, 300));

    return qb.getMany();
  }

  /**
   * Match job_posts đã có trong DB với intent (không upsert lại job):
   * AI classify + ghi JobIntentMatch, giống saveCrawledJobs.
   */
  private async saveDbMatches(intent: JobSearchIntent, jobPosts: JobPost[]) {
    if (jobPosts.length === 0) {
      return 0;
    }

    const targetSeniority = intent.seniorityLevelId
      ? await this.seniorityRepository.findOneBy({
          id: intent.seniorityLevelId,
        })
      : null;
    const seniorityRows: Array<{ job_post_id: string; code: string }> =
      await this.jobPostRepository.query(
        `SELECT jsl."job_post_id", sl."code"
           FROM "job_post_seniority_levels" jsl
           JOIN "seniority_levels" sl ON sl."id" = jsl."seniority_level_id"
          WHERE jsl."job_post_id" = ANY($1::uuid[])
          ORDER BY jsl."is_primary" DESC, jsl."confidence" DESC`,
        [jobPosts.map((job) => job.id)],
      );
    const codesByJob = new Map<string, string[]>();
    for (const row of seniorityRows) {
      codesByJob.set(row.job_post_id, [
        ...(codesByJob.get(row.job_post_id) ?? []),
        row.code,
      ]);
    }
    const compatibilityRows: Array<{
      job_code: string;
      relation: 'exact' | 'adjacent' | 'stretch' | 'incompatible';
      score_penalty: number;
    }> = targetSeniority
      ? await this.seniorityRepository.query(
          `SELECT "job_code", "relation", "score_penalty"
             FROM "seniority_compatibility"
            WHERE "candidate_code" = $1`,
          [targetSeniority.code],
        )
      : [];
    const compatibilityByCode = new Map(
      compatibilityRows.map((row) => [row.job_code, row]),
    );
    const eligibleJobs = jobPosts.filter((job) => {
      if (!targetSeniority) return true;
      const codes = codesByJob.get(job.id) ?? [];
      return codes.some(
        (code) => compatibilityByCode.get(code)?.relation !== 'incompatible',
      );
    });

    const results = await this.aiEngine.classifyJobMatches({
      target: {
        targetRole: intent.targetRole,
        seniorityLevelName: intent.seniorityLevelName,
        keywords: intent.keywords ?? [],
      },
      jobs: eligibleJobs.map((jobPost) => ({
        jobId: jobPost.id,
        title: jobPost.title,
        categoryName: jobPost.jobCategoryName,
        seniorityCode: (codesByJob.get(jobPost.id) ?? [])[0] ?? null,
        skills: jobPost.skills,
      })),
    });
    const resultByJobId = new Map(
      results.map((result) => [result.job_id, result]),
    );
    let savedCount = 0;

    for (const jobPost of eligibleJobs) {
      const result = resultByJobId.get(jobPost.id);

      if (!result || result.match_kind === 'reject') {
        continue;
      }

      const jobCodes = codesByJob.get(jobPost.id) ?? [];
      const rankedCompatibilities = jobCodes
        .map((code) => ({ code, compatibility: compatibilityByCode.get(code) }))
        .filter((item) => item.compatibility?.relation !== 'incompatible')
        .sort(
          (a, b) =>
            (a.compatibility?.score_penalty ?? 0) -
            (b.compatibility?.score_penalty ?? 0),
        );
      const jobSeniorityCode = rankedCompatibilities[0]?.code ?? null;
      const compatibility = rankedCompatibilities[0]?.compatibility ?? null;
      const matchKind =
        compatibility && compatibility.relation !== 'exact'
          ? 'suggestion'
          : result.match_kind;
      const matchScore = Math.max(
        0,
        result.score - (compatibility?.score_penalty ?? 0),
      );

      await this.matchRepository.upsert(
        {
          intentId: intent.id,
          jobPostId: jobPost.id,
          matchScore:
            matchKind === 'suggestion' ? Math.min(matchScore, 59) : matchScore,
          matchedTerms: [
            `category:${jobPost.jobCategoryId ?? 'unknown'}`,
            ...(jobSeniorityCode ? [`seniority:${jobSeniorityCode}`] : []),
          ],
          matchKind,
          matchReason: result.reason,
        },
        ['intentId', 'jobPostId'],
      );
      savedCount += 1;
    }

    return savedCount;
  }

  async upsertCrawledJobs(crawledJobs: CrawledJob[]): Promise<number> {
    let saved = 0;

    for (const crawledJob of crawledJobs) {
      const expectedDeadlineSource: Partial<Record<JobSource, string>> = {
        topcv: 'topcv_json_ld',
        itviec: 'itviec_json_ld',
        vietnamworks: 'vietnamworks_api',
      };
      if (
        !crawledJob.sourceJobId ||
        !crawledJob.title ||
        !crawledJob.categoryId ||
        !crawledJob.expiredAt ||
        crawledJob.expiredAt <= new Date() ||
        crawledJob.seniorityMatches.length === 0 ||
        crawledJob.raw.deadline_source !==
          expectedDeadlineSource[crawledJob.source] ||
        (crawledJob.postedAt != null &&
          crawledJob.expiredAt <= crawledJob.postedAt)
      ) {
        continue;
      }

      if (await this.upsertJobPost(null, crawledJob)) saved += 1;
    }

    return saved;
  }

  private async upsertJobPost(
    _intent: JobSearchIntent | null,
    crawledJob: CrawledJob,
  ) {
    const searchText = normalizeSearchText(
      [
        crawledJob.title,
        crawledJob.companyName,
        crawledJob.salaryText,
        crawledJob.locations.join(' '),
        crawledJob.sourceSeniorityText,
        crawledJob.skills.join(' '),
      ].join(' '),
    );
    const contentHash = createContentHash([
      crawledJob.title,
      crawledJob.companyName,
      crawledJob.salaryText,
      crawledJob.skills.join(','),
    ]);
    const dedupKey = createContentHash([
      crawledJob.sourceUrl,
      crawledJob.title,
    ]);
    const now = new Date();
    if (!crawledJob.categoryId || !crawledJob.expiredAt) return null;
    const [category, categorySeniorityRules] = await Promise.all([
      this.categoryRepository.findOneBy({
        id: crawledJob.categoryId,
        isActive: true,
      }),
      this.categorySeniorityRepository.findBy({
        categoryId: crawledJob.categoryId,
        isSelectable: true,
      }),
    ]);
    const allowedCodes = new Set(
      categorySeniorityRules.map((rule) => rule.seniorityCode),
    );
    const validMatches = crawledJob.seniorityMatches
      .filter((match) => allowedCodes.has(match.code))
      .sort(
        (a, b) =>
          Number(b.isPrimary) - Number(a.isPrimary) ||
          b.confidence - a.confidence,
      )
      .map((match, index) => ({ ...match, isPrimary: index === 0 }));
    const seniorityLevels = await this.seniorityRepository.findBy({
      code: In(validMatches.map((match) => match.code)),
      isActive: true,
    });
    if (
      !category ||
      validMatches.length === 0 ||
      seniorityLevels.length !==
        new Set(validMatches.map((match) => match.code)).size
    ) {
      return null;
    }
    const seniorityByCode = new Map(
      seniorityLevels.map((level) => [level.code, level]),
    );

    // Chống trùng theo (source, source_job_id) hoặc (source, source_url, title):
    // job cùng URL+title (đăng lại, cross-source) không tạo row mới.
    const existingJobPost = await this.jobPostRepository
      .createQueryBuilder('job')
      .where(
        '(job.source = :source AND job.source_job_id = :sourceJobId) OR ' +
          '(job.source = :source AND job.dedup_key = :dedupKey)',
        {
          source: crawledJob.source,
          sourceJobId: crawledJob.sourceJobId,
          dedupKey,
        },
      )
      .take(1)
      .getOne();
    const categoryEvidence =
      crawledJob.raw.category_evidence &&
      typeof crawledJob.raw.category_evidence === 'object'
        ? (crawledJob.raw.category_evidence as Record<string, unknown>)
        : null;
    const sourceRaw = { ...crawledJob.raw };
    delete sourceRaw.category_evidence;
    const jobPost = this.jobPostRepository.create({
      ...(existingJobPost ?? {}),
      source: crawledJob.source,
      sourceJobId: crawledJob.sourceJobId,
      sourceUrl: crawledJob.sourceUrl,
      dedupKey,
      title: crawledJob.title,
      companyName: crawledJob.companyName,
      salaryText: crawledJob.salaryText,
      salaryMin: crawledJob.salaryMin,
      salaryMax: crawledJob.salaryMax,
      salaryCurrency: crawledJob.salaryCurrency,
      jobType: crawledJob.jobType,
      experience: crawledJob.experience,
      experienceMin: crawledJob.experienceMin,
      experienceMax: crawledJob.experienceMax,
      logo: crawledJob.logo,
      locations: crawledJob.locations,
      jobCategoryId: crawledJob.categoryId,
      jobCategoryName: crawledJob.categoryName ?? null,
      categoryConfidence: crawledJob.categoryId
        ? categoryEvidence?.kind === 'native_fixed_page'
          ? 1
          : 0.9
        : null,
      categoryEvidence: crawledJob.categoryId
        ? categoryEvidence
          ? categoryEvidence
          : {
              strategy: 'canonical-title-source-classifier',
              title: crawledJob.title,
            }
        : {},
      sourceCategoryRaw:
        crawledJob.raw.jobFunction &&
        typeof crawledJob.raw.jobFunction === 'object'
          ? (crawledJob.raw.jobFunction as Record<string, unknown>)
          : {},
      skills: crawledJob.skills,
      searchText,
      contentHash,
      postedAt: crawledJob.postedAt,
      expiredAt: crawledJob.expiredAt,
      lastSeenAt: now,
      raw: {
        ...sourceRaw,
        source_seniority_key: crawledJob.sourceSeniorityKey,
        source_seniority_text: crawledJob.sourceSeniorityText,
      },
    });

    const savedJob = await this.jobPostRepository.save(jobPost);
    await this.jobPostSeniorityRepository.delete({ jobPostId: savedJob.id });
    await this.jobPostSeniorityRepository.save(
      validMatches.map((match) =>
        this.jobPostSeniorityRepository.create({
          jobPostId: savedJob.id,
          seniorityLevelId: seniorityByCode.get(match.code)!.id,
          mappingMethod: match.mappingMethod,
          confidence: match.confidence,
          evidence: {
            ...match.evidence,
            source_seniority_key: crawledJob.sourceSeniorityKey,
            source_seniority_text: crawledJob.sourceSeniorityText,
          },
          isPrimary: match.isPrimary,
        }),
      ),
    );
    return savedJob;
  }

  private async snapshotResearchSessionJobs(intentId: string) {
    const intent = await this.intentRepository.findOneBy({ id: intentId });

    if (!intent?.researchSessionId || !intent.researchSessionAttempt) {
      return;
    }

    const matches = await this.matchRepository
      .createQueryBuilder('match')
      .innerJoinAndSelect('match.jobPost', 'job')
      .where('match.intent_id = :intentId', { intentId: intent.id })
      .andWhere("match.match_kind != 'reject'")
      .orderBy('match.match_score', 'DESC')
      .addOrderBy('job.last_seen_at', 'DESC')
      .getMany();

    const snapshotResult = await this.researchSessionRepository.update(
      {
        id: intent.researchSessionId,
        attempt: intent.researchSessionAttempt,
        status: In(['queued', 'processing']),
      },
      {
        jobSuggestionsSnapshot: matches.map((match) => ({
          match_score: match.matchScore,
          matched_terms: match.matchedTerms,
          match_reason: match.matchReason,
          job: {
            id: match.jobPost.id,
            source: match.jobPost.source,
            source_url: match.jobPost.sourceUrl,
            title: match.jobPost.title,
            company_name: match.jobPost.companyName,
            salary_text: match.jobPost.salaryText,
            locations: match.jobPost.locations,
            seniority_text:
              typeof match.jobPost.raw.source_seniority_text === 'string'
                ? match.jobPost.raw.source_seniority_text
                : null,
            skills: match.jobPost.skills,
          },
        })),
      },
    );

    if (snapshotResult.affected !== 1) {
      return;
    }

    if (intent.status === 'failed') {
      await this.progressService.fail(
        intent.researchSessionId,
        intent.researchSessionAttempt,
        intent.error || 'Tất cả nguồn việc làm đã được cấu hình đều thất bại.',
      );
    } else {
      await this.progressService.complete(
        intent.researchSessionId,
        intent.researchSessionAttempt,
        `Research hoàn tất với ${matches.length} việc làm phù hợp.`,
      );
    }
  }

  private formatError(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
