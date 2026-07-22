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
import { CvResearchSession } from '../cv/entities/cv-research-session.entity';
import { CvAudit } from '../cv/entities/cv-audit.entity';
import { JobFamilyCategory } from '../job-category/entities/job-family-category.entity';
import { SeniorityLevel } from '../seniority/entities/seniority-level.entity';
import { IndeedConnector } from './connectors/indeed.connector';
import { TopCvConnector } from './connectors/topcv.connector';
import { VietnamWorksConnector } from './connectors/vietnamworks.connector';
import { CreateJobResearchIntentDto } from './dto/create-job-research-intent.dto';
import { JobCrawlRun } from './entities/job-crawl-run.entity';
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

interface CreateIntentResult {
  intent: JobSearchIntent;
  queueJobId: string | number | undefined;
}

interface JobMatchProfile {
  normalizedTargetRole: string;
  roleTerms: string[];
  positiveTerms: string[];
  roleFamilies: Array<(typeof ROLE_FAMILIES)[number]>;
  seniorityGroup: SeniorityGroup | null;
}

interface JobMatchResult {
  score: number;
  terms: string[];
  accepted: boolean;
}

type SeniorityGroup = 'intern' | 'junior' | 'mid' | 'senior' | 'leadership';

const MIN_JOB_MATCH_SCORE = 18;

const GENERIC_JOB_TERMS = new Set([
  'job',
  'role',
  'position',
  'career',
  'software',
  'engineering',
  'software engineering',
  'information technology',
  'technology',
  'developer',
  'engineer',
  'intern',
  'junior',
  'middle',
  'mid',
  'senior',
  'staff',
]);

const TOKEN_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'or',
  'of',
  'the',
  'for',
  'to',
  'with',
  'in',
  'on',
  'job',
  'role',
  'position',
  'developer',
  'engineer',
  'specialist',
  'intern',
  'junior',
  'middle',
  'mid',
  'senior',
]);

const ROLE_FAMILIES = [
  {
    name: 'frontend',
    triggers: ['frontend', 'front end', 'front-end', 'react', 'nextjs', 'next.js'],
    evidence: [
      'frontend',
      'front end',
      'front-end',
      'react',
      'reactjs',
      'nextjs',
      'next.js',
      'javascript',
      'typescript',
      'html',
      'css',
      'tailwind',
      'ui',
      'web interface',
      'web developer',
    ],
  },
  {
    name: 'backend',
    triggers: ['backend', 'back end', 'back-end', 'server', 'api', 'nestjs'],
    evidence: [
      'backend',
      'back end',
      'back-end',
      'server',
      'api',
      'rest',
      'nodejs',
      'node.js',
      'nestjs',
      'express',
      'database',
      'postgresql',
      'mysql',
      'mongodb',
      'java',
      'spring',
      'golang',
      'python',
    ],
  },
  {
    name: 'qa',
    triggers: ['tester', 'testing', 'qa', 'quality assurance', 'test automation'],
    evidence: [
      'tester',
      'testing',
      'qa',
      'quality assurance',
      'test automation',
      'manual test',
      'automation test',
      'selenium',
      'cypress',
      'playwright',
      'test case',
      'bug report',
      'jira',
    ],
  },
  {
    name: 'mobile',
    triggers: ['mobile', 'android', 'ios', 'flutter', 'react native'],
    evidence: [
      'mobile',
      'android',
      'ios',
      'flutter',
      'react native',
      'swift',
      'kotlin',
    ],
  },
  {
    name: 'data',
    triggers: ['data', 'analytics', 'analyst', 'machine learning', 'ai'],
    evidence: [
      'data',
      'analytics',
      'analyst',
      'machine learning',
      'ai',
      'python',
      'sql',
      'pandas',
      'tensorflow',
      'pytorch',
    ],
  },
  {
    name: 'devops',
    triggers: ['devops', 'cloud', 'sre', 'infrastructure'],
    evidence: [
      'devops',
      'cloud',
      'sre',
      'infrastructure',
      'docker',
      'kubernetes',
      'aws',
      'gcp',
      'azure',
      'ci cd',
      'ci/cd',
    ],
  },
] as const;

const SENIORITY_TERMS: Record<SeniorityGroup, string[]> = {
  intern: ['intern', 'internship', 'fresher', 'thuc tap', 'thực tập'],
  junior: ['junior', 'entry level', 'fresher'],
  mid: ['middle', 'mid level', 'mid-level', '2 years', '3 years'],
  senior: ['senior', 'sr', 'experienced', '4 years', '5 years'],
  leadership: ['lead', 'leader', 'manager', 'head', 'director', 'principal'],
};

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
    topCvConnector: TopCvConnector,
    vietnamWorksConnector: VietnamWorksConnector,
    indeedConnector: IndeedConnector,
  ) {
    this.connectors = new Map<JobSource, JobSourceConnector>([
      [topCvConnector.source, topCvConnector],
      [vietnamWorksConnector.source, vietnamWorksConnector],
      [indeedConnector.source, indeedConnector],
    ]);
  }

  async createIntent(
    dto: CreateJobResearchIntentDto,
    userId: string,
    options: { researchSessionId?: string } = {},
  ): Promise<CreateIntentResult> {
    const resolved = await this.resolveIntent(dto, userId);
    const intent = await this.intentRepository.save(
      this.intentRepository.create({
        ...resolved,
        researchSessionId: options.researchSessionId ?? null,
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
        backoff: { type: 'exponential', delay: 3000 },
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

    try {
      const payload = this.toPayload(intent);
      const completedSources: JobSource[] = [];
      const errors: string[] = [];
      let totalJobs = 0;

      for (const source of payload.sources) {
        const connector = this.connectors.get(source);

        if (!connector) {
          errors.push(`${source}: connector is not registered`);
          continue;
        }

        const run = await this.startRun(intent, source, payload);

        try {
          const crawledJobs = await connector.search(payload);
          const savedCount = await this.saveCrawledJobs(intent, crawledJobs);
          totalJobs += savedCount;
          completedSources.push(source);
          await this.completeRun(run, crawledJobs.length, savedCount);
        } catch (error) {
          const message = this.formatError(error);
          errors.push(`${source}: ${message}`);
          await this.failRun(run, message);
        }
      }

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
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: { age: 86400, count: 1000 },
      },
    );

    return {
      intent: await this.buildIntentResponse(intent.id),
      queueJobId: queueJob.id,
    };
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

  async getIntentJobs(intentId: string, userId: string, limit = 30) {
    await this.findUserIntentOrThrow(intentId, userId);
    const safeLimit = clamp(limit, 1, 100);
    const rows = await this.matchRepository
      .createQueryBuilder('match')
      .innerJoinAndSelect('match.jobPost', 'job')
      .where('match.intent_id = :intentId', { intentId })
      .andWhere('match.match_score >= :minScore', {
        minScore: MIN_JOB_MATCH_SCORE,
      })
      .orderBy('match.match_score', 'DESC')
      .addOrderBy('job.last_seen_at', 'DESC')
      .limit(safeLimit)
      .getMany();

    return rows.map((match) => ({
      match_score: match.matchScore,
      matched_terms: match.matchedTerms,
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
      seniority?.name || audit?.seniorityLevelName || undefined,
    );
    const keywords = uniqueNonEmpty([
      ...(dto.keywords ?? []),
      jobCategoryName,
      targetRole,
      seniorityLevelName,
      ...this.extractAuditKeywords(audit),
    ]);
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
      completedAt: new Date(),
      error: null,
    });
  }

  private async failRun(run: JobCrawlRun, error: string) {
    await this.crawlRunRepository.update(run.id, {
      status: 'failed',
      error,
      completedAt: new Date(),
    });
  }

  private async saveCrawledJobs(
    intent: JobSearchIntent,
    crawledJobs: CrawledJob[],
  ) {
    let savedCount = 0;
    const profile = this.buildMatchProfile(intent);

    for (const crawledJob of crawledJobs) {
      if (!crawledJob.sourceJobId || !crawledJob.title) {
        continue;
      }

      const jobPost = await this.upsertJobPost(intent, crawledJob);
      const match = this.scoreJobMatch(profile, jobPost);

      if (!match.accepted) {
        continue;
      }

      await this.matchRepository.upsert(
        {
          intentId: intent.id,
          jobPostId: jobPost.id,
          matchScore: match.score,
          matchedTerms: match.terms,
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
        crawledJob.description,
        crawledJob.requirements,
        crawledJob.benefits,
        crawledJob.skills.join(' '),
      ].join(' '),
    );
    const contentHash = createContentHash([
      crawledJob.title,
      crawledJob.companyName,
      crawledJob.salaryText,
      crawledJob.description,
      crawledJob.requirements,
      crawledJob.benefits,
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
      locations: crawledJob.locations,
      seniorityText: crawledJob.seniorityText,
      jobCategoryId: intent.jobCategoryId,
      jobCategoryName: intent.jobCategoryName,
      seniorityLevelId: intent.seniorityLevelId,
      seniorityLevelName: intent.seniorityLevelName,
      description: crawledJob.description,
      requirements: crawledJob.requirements,
      benefits: crawledJob.benefits,
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

  private buildMatchProfile(intent: JobSearchIntent): JobMatchProfile {
    const normalizedTargetRole = normalizeSearchText(intent.targetRole);
    const roleTerms = this.tokenizeMeaningfulTerms(intent.targetRole);
    const targetSourceText = normalizeSearchText(
      [intent.targetRole, intent.seniorityLevelName].join(' '),
    );
    const keywordSourceText = normalizeSearchText(
      (intent.keywords ?? []).join(' '),
    );
    const primaryRoleFamilies = ROLE_FAMILIES.filter((family) =>
      family.triggers.some((trigger) =>
        targetSourceText.includes(normalizeSearchText(trigger)),
      ),
    );
    const roleFamilyCandidates =
      primaryRoleFamilies.length > 0 ? primaryRoleFamilies : ROLE_FAMILIES;
    const roleFamilySourceText =
      primaryRoleFamilies.length > 0 ? targetSourceText : keywordSourceText;
    const roleFamilies = roleFamilyCandidates.filter((family) =>
      family.triggers.some((trigger) =>
        roleFamilySourceText.includes(normalizeSearchText(trigger)),
      ),
    );
    const positiveTerms = uniqueNonEmpty([
      intent.targetRole,
      ...(intent.keywords ?? []),
    ]).filter((term) => this.isUsefulMatchTerm(term));

    return {
      normalizedTargetRole,
      roleTerms,
      positiveTerms,
      roleFamilies,
      seniorityGroup: this.resolveSeniorityGroup(
        [intent.seniorityLevelName, intent.targetRole].join(' '),
      ),
    };
  }

  private scoreJobMatch(
    profile: JobMatchProfile,
    jobPost: JobPost,
  ): JobMatchResult {
    const normalizedTitle = normalizeSearchText(jobPost.title);
    const normalizedSearch = jobPost.searchText;
    const matchedTerms: string[] = [];
    let score = 0;

    const familyMatches = this.collectRoleFamilyMatches(
      profile,
      normalizedTitle,
      normalizedSearch,
    );
    const roleTermMatches = profile.roleTerms.filter((term) =>
      normalizedSearch.includes(term),
    );
    const titleRoleTermMatches = profile.roleTerms.filter((term) =>
      normalizedTitle.includes(term),
    );
    const hasRoleEvidence =
      profile.roleFamilies.length === 0 ||
      familyMatches.length > 0 ||
      titleRoleTermMatches.length > 0;

    if (!hasRoleEvidence) {
      return { score: 0, terms: [], accepted: false };
    }

    if (
      profile.normalizedTargetRole &&
      normalizedTitle.includes(profile.normalizedTargetRole)
    ) {
      score += 42;
      matchedTerms.push(jobPost.title);
    } else if (titleRoleTermMatches.length > 0) {
      score += Math.min(28, titleRoleTermMatches.length * 12);
      matchedTerms.push(...titleRoleTermMatches);
    } else if (roleTermMatches.length > 0) {
      score += Math.min(16, roleTermMatches.length * 5);
      matchedTerms.push(...roleTermMatches);
    }

    if (familyMatches.length > 0) {
      score += Math.min(24, familyMatches.length * 6);
      matchedTerms.push(...familyMatches);
    }

    for (const term of profile.positiveTerms) {
      const normalizedTerm = normalizeSearchText(term);

      if (!normalizedTerm) {
        continue;
      }

      if (normalizedTitle.includes(normalizedTerm)) {
        score += 8;
        matchedTerms.push(term);
        continue;
      }

      if (normalizedSearch.includes(normalizedTerm)) {
        score += 3;
        matchedTerms.push(term);
      }
    }

    const seniorityScore = this.scoreSeniorityFit(profile, [
      normalizedTitle,
      normalizeSearchText(jobPost.seniorityText),
      normalizedSearch,
    ].join(' '));
    score += seniorityScore;

    const finalScore = clamp(score, 0, 100);

    if (finalScore < MIN_JOB_MATCH_SCORE) {
      return {
        score: finalScore,
        terms: uniqueNonEmpty(matchedTerms),
        accepted: false,
      };
    }

    return {
      score: finalScore,
      terms: uniqueNonEmpty(matchedTerms),
      accepted: true,
    };
  }

  private async snapshotResearchSessionJobs(intentId: string) {
    const intent = await this.intentRepository.findOneBy({ id: intentId });

    if (!intent?.researchSessionId) {
      return;
    }

    const matches = await this.matchRepository
      .createQueryBuilder('match')
      .innerJoinAndSelect('match.jobPost', 'job')
      .where('match.intent_id = :intentId', { intentId: intent.id })
      .andWhere('match.match_score >= :minScore', {
        minScore: MIN_JOB_MATCH_SCORE,
      })
      .orderBy('match.match_score', 'DESC')
      .addOrderBy('job.last_seen_at', 'DESC')
      .limit(12)
      .getMany();

    await this.researchSessionRepository.update(intent.researchSessionId, {
      status: intent.status === 'failed' ? 'failed' : 'completed',
      completedAt: new Date(),
      error: intent.error,
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
    });
  }

  private formatError(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private tokenizeMeaningfulTerms(value: string | null | undefined) {
    return uniqueNonEmpty(
      normalizeSearchText(value)
        .split(' ')
        .map((token) => token.trim())
        .filter(
          (token) =>
            token.length >= 3 &&
            !TOKEN_STOP_WORDS.has(token) &&
            !GENERIC_JOB_TERMS.has(token),
        ),
    );
  }

  private isUsefulMatchTerm(value: string | null | undefined) {
    const normalized = normalizeSearchText(value);

    if (!normalized || normalized.length < 3) {
      return false;
    }

    if (GENERIC_JOB_TERMS.has(normalized)) {
      return false;
    }

    return normalized
      .split(' ')
      .some((token) => token.length >= 3 && !TOKEN_STOP_WORDS.has(token));
  }

  private collectRoleFamilyMatches(
    profile: JobMatchProfile,
    normalizedTitle: string,
    normalizedSearch: string,
  ) {
    const matches: string[] = [];

    for (const family of profile.roleFamilies) {
      for (const evidence of family.evidence) {
        const normalizedEvidence = normalizeSearchText(evidence);

        if (!normalizedEvidence) {
          continue;
        }

        if (normalizedTitle.includes(normalizedEvidence)) {
          matches.push(evidence);
          continue;
        }

        if (normalizedSearch.includes(normalizedEvidence)) {
          matches.push(evidence);
        }
      }
    }

    return uniqueNonEmpty(matches);
  }

  private resolveSeniorityGroup(
    value: string | null | undefined,
  ): SeniorityGroup | null {
    const normalized = normalizeSearchText(value);

    if (!normalized) {
      return null;
    }

    for (const [group, terms] of Object.entries(SENIORITY_TERMS)) {
      if (terms.some((term) => normalized.includes(normalizeSearchText(term)))) {
        return group as SeniorityGroup;
      }
    }

    return null;
  }

  private scoreSeniorityFit(profile: JobMatchProfile, normalizedJobText: string) {
    if (!profile.seniorityGroup) {
      return 0;
    }

    const targetTerms = SENIORITY_TERMS[profile.seniorityGroup];
    const hasTargetSeniority = targetTerms.some((term) =>
      normalizedJobText.includes(normalizeSearchText(term)),
    );

    if (hasTargetSeniority) {
      return 8;
    }

    if (
      ['intern', 'junior'].includes(profile.seniorityGroup) &&
      [...SENIORITY_TERMS.senior, ...SENIORITY_TERMS.leadership].some((term) =>
        normalizedJobText.includes(normalizeSearchText(term)),
      )
    ) {
      return -28;
    }

    if (
      ['senior', 'leadership'].includes(profile.seniorityGroup) &&
      SENIORITY_TERMS.intern.some((term) =>
        normalizedJobText.includes(normalizeSearchText(term)),
      )
    ) {
      return -18;
    }

    return 0;
  }
}
