import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { In, Repository } from 'typeorm';

import type { Env } from '../../config/env.schema';
import { runWithConcurrency } from '../../shared/utils/run-with-concurrency';
import { CvResearchSession } from '../cv/entities/cv-research-session.entity';
import { CvAudit } from '../cv/entities/cv-audit.entity';
import { JobFamilyCategory } from '../job-category/entities/job-family-category.entity';
import { SeniorityLevel } from '../seniority/entities/seniority-level.entity';
import { ResearchProgressService } from '../research-realtime/research-progress.service';
import { CrawlerApiConnector } from './connectors/crawler-api.connector';
import { CrawlerHttpService } from './crawler-http.service';
import { CreateJobResearchIntentDto } from './dto/create-job-research-intent.dto';
import { JobCrawlRun } from './entities/job-crawl-run.entity';
import { AiEngineService } from '../ai/ai-engine.service';
import { JobIntentMatch } from './entities/job-intent-match.entity';
import { JobPost } from './entities/job-post.entity';
import { JobSearchIntent } from './entities/job-search-intent.entity';
import type {
  CrawledJob,
  JobSearchIntentPayload,
  JobSourceConnector,
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
  private readonly connectors: Map<JobSource, JobSourceConnector>;

  constructor(
    @InjectQueue(JOB_RESEARCH_QUEUE)
    private readonly queue: Queue<{ intentId: string }>,
    @InjectRepository(JobSearchIntent)
    private readonly intentRepository: Repository<JobSearchIntent>,
    @InjectRepository(JobCrawlRun)
    private readonly crawlRunRepository: Repository<JobCrawlRun>,
    @InjectRepository(JobPost)
    private readonly jobPostRepository: Repository<JobPost>,
    @InjectRepository(JobIntentMatch)
    private readonly matchRepository: Repository<JobIntentMatch>,
    @InjectRepository(CvResearchSession)
    private readonly researchSessionRepository: Repository<CvResearchSession>,
    @InjectRepository(CvAudit)
    private readonly auditRepository: Repository<CvAudit>,
    @InjectRepository(JobFamilyCategory)
    private readonly categoryRepository: Repository<JobFamilyCategory>,
    @InjectRepository(SeniorityLevel)
    private readonly seniorityRepository: Repository<SeniorityLevel>,
    private readonly config: ConfigService<Env, true>,
    private readonly progressService: ResearchProgressService,
    private readonly crawlerHttp: CrawlerHttpService,
    private readonly aiEngine: AiEngineService,
  ) {
    this.connectors = new Map<JobSource, JobSourceConnector>(
      JOB_SOURCES.map((source) => [
        source,
        new CrawlerApiConnector(source, crawlerHttp, this.config),
      ]),
    );
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
      throw new NotFoundException('Job search intent does not exist.');
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
          message: 'Searching for current jobs that fit your CV.',
        },
        intent.researchSessionAttempt ?? undefined,
      );
    }

    try {
      const payload = this.toPayload(intent);
      let finishedSources = 0;
      const sourceResults = await runWithConcurrency(
        payload.sources,
        this.config.get('JOB_RESEARCH_SOURCE_CONCURRENCY', { infer: true }),
        async (source) => {
          const connector = this.connectors.get(source);

          if (!connector) {
            return {
              source,
              savedCount: 0,
              completed: false,
              error: 'connector is not registered',
            };
          }

          const run = await this.startRun(intent, source, payload);

          try {
            const crawledJobs = await connector.search(payload);
            const savedCount = await this.saveCrawledJobs(intent, crawledJobs);
            await this.completeRun(run, crawledJobs.length, savedCount);
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
                    'Comparing available jobs with your experience and career level.',
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
        error: 'Superseded by a retry after the previous queue job stopped.',
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
      .addOrderBy(
        "CASE match.match_kind WHEN 'match' THEN 0 ELSE 1 END",
        'ASC',
      )
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
      throw new NotFoundException('CV audit does not exist.');
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
      throw new BadRequestException('Selected job category does not exist.');
    }

    if (seniorityId && !seniority) {
      throw new BadRequestException('Selected seniority level does not exist.');
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
        'Job research requires an audit, target role, job category, or keyword.',
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
      !!targetRole &&
      normalized === normalizeSearchText(targetRole);
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
      throw new NotFoundException('Job search intent does not exist.');
    }

    return intent;
  }

  private async findUserIntentOrThrow(intentId: string, userId: string) {
    const intent = await this.intentRepository.findOneBy({
      id: intentId,
      userId,
    });

    if (!intent) {
      throw new NotFoundException('Job search intent does not exist.');
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

  private async saveCrawledJobs(
    intent: JobSearchIntent,
    crawledJobs: CrawledJob[],
  ) {
    let savedCount = 0;
    const jobPosts: JobPost[] = [];

    for (const crawledJob of crawledJobs) {
      if (!crawledJob.sourceJobId || !crawledJob.title) {
        continue;
      }

      jobPosts.push(await this.upsertJobPost(intent, crawledJob));
    }

    if (jobPosts.length === 0) {
      return 0;
    }

    const results = await this.aiEngine.classifyJobMatches({
      target: {
        targetRole: intent.targetRole,
        seniorityLevelName: intent.seniorityLevelName,
        keywords: intent.keywords ?? [],
      },
      jobs: jobPosts.map((jobPost) => ({
        jobId: jobPost.id,
        title: jobPost.title,
      })),
    });
    const resultByJobId = new Map(
      results.map((result) => [result.job_id, result]),
    );

    for (const jobPost of jobPosts) {
      const result = resultByJobId.get(jobPost.id);

      if (!result || result.match_kind === 'reject') {
        continue;
      }

      await this.matchRepository.upsert(
        {
          intentId: intent.id,
          jobPostId: jobPost.id,
          matchScore: result.score,
          matchedTerms: result.level ? [result.level] : [],
          matchKind: result.match_kind,
          matchReason: result.reason,
        },
        ['intentId', 'jobPostId'],
      );
      savedCount += 1;
    }

    return savedCount;
  }

  private async upsertJobPost(intent: JobSearchIntent, crawledJob: CrawledJob) {
    const searchText = normalizeSearchText(
      [
        crawledJob.title,
        crawledJob.companyName,
        crawledJob.salaryText,
        crawledJob.locations.join(' '),
        crawledJob.seniorityText,
        crawledJob.skills.join(' '),
      ].join(' '),
    );
    const contentHash = createContentHash([
      crawledJob.title,
      crawledJob.companyName,
      crawledJob.salaryText,
      crawledJob.skills.join(','),
    ]);
    const now = new Date();

    const existingJobPost = await this.jobPostRepository.findOneBy({
      source: crawledJob.source,
      sourceJobId: crawledJob.sourceJobId,
    });
    const jobPost = this.jobPostRepository.create({
      ...(existingJobPost ?? {}),
      source: crawledJob.source,
      sourceJobId: crawledJob.sourceJobId,
      sourceUrl: crawledJob.sourceUrl,
      title: crawledJob.title,
      companyName: crawledJob.companyName,
      salaryText: crawledJob.salaryText,
      salaryMin: crawledJob.salaryMin,
      salaryMax: crawledJob.salaryMax,
      salaryCurrency: crawledJob.salaryCurrency,
      jobType: crawledJob.jobType,
      level: crawledJob.level,
      experience: crawledJob.experience,
      experienceMin: crawledJob.experienceMin,
      experienceMax: crawledJob.experienceMax,
      logo: crawledJob.logo,
      locations: crawledJob.locations,
      seniorityText: crawledJob.seniorityText,
      jobCategoryId: null,
      jobCategoryName: null,
      seniorityLevelId: null,
      seniorityLevelName: null,
      skills: crawledJob.skills,
      searchText,
      contentHash,
      postedAt: crawledJob.postedAt,
      expiredAt: crawledJob.expiredAt,
      lastSeenAt: now,
      raw: crawledJob.raw,
    });

    return this.jobPostRepository.save(jobPost);
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
          job: {
            id: match.jobPost.id,
            source: match.jobPost.source,
            source_url: match.jobPost.sourceUrl,
            title: match.jobPost.title,
            company_name: match.jobPost.companyName,
            salary_text: match.jobPost.salaryText,
            locations: match.jobPost.locations,
            seniority_text: match.jobPost.seniorityText,
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
        intent.error || 'All configured job sources failed.',
      );
    } else {
      await this.progressService.complete(
        intent.researchSessionId,
        intent.researchSessionAttempt,
        `Research completed with ${matches.length} matching jobs.`,
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
