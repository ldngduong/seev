import { InjectQueue } from '@nestjs/bullmq';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import type { Queue } from 'bullmq';
import { DataSource, In, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { AiEngineService } from '../ai/ai-engine.service';
import { BillingService } from '../billing/billing.service';
import type { ServiceCode } from '../billing/entities/service-product.entity';
import { ActivityService } from '../activity/activity.service';
import type { CvAuditResult } from '../ai/schemas/cv-audit-result.schema';
import { JobResearchService } from '../crawler/job-research.service';
import { uniqueNonEmpty } from '../crawler/utils/text-normalizer';
import { JobCategory } from '../job-category/entities/job-category.entity';
import { SeniorityLevel } from '../seniority/entities/seniority-level.entity';
import { ResearchProgressService } from '../research-realtime/research-progress.service';
import type {
  ResearchSessionListQueryDto,
  UserCvListQueryDto,
} from './dto/cv-list-query.dto';
import { R2StorageService } from '../storage/r2-storage.service';
import { CreateCvAuditDto } from './dto/create-cv-audit.dto';
import {
  CreateCustomCvResearchDto,
  CreateQuickCvResearchDto,
} from './dto/create-cv-research.dto';
import { UploadUserCvDto } from './dto/upload-user-cv.dto';
import { CvAuditBatch } from './entities/cv-audit-batch.entity';
import { CvAudit } from './entities/cv-audit.entity';
import {
  CvResearchSession,
  CvResearchTargetSource,
  CvResearchType,
} from './entities/cv-research-session.entity';
import { UserCv } from './entities/user-cv.entity';
import type { ParsedResume } from './interfaces/parsed-resume.interface';
import {
  CURRENT_PDF_PARSER_VERSION,
  PdfParserService,
} from './pdf-parser.service';
import {
  CV_RESEARCH_JOB,
  CV_RESEARCH_QUEUE,
  type CvResearchJobData,
} from './types/cv-research-queue.type';

export interface CvAuditResponse extends CvAuditResult {
  audit_id: string;
  file_name: string;
  total_pages: number;
}

export interface CvAuditHistoryItem {
  audit_id: string;
  file_name: string;
  target_role: string | null;
  job_category_id: string | null;
  job_category_name: string | null;
  seniority_level_id: string | null;
  seniority_level_name: string | null;
  status: CvAudit['status'];
  overall_score: number | null;
  total_pages: number;
  suggested_keywords: string[];
  suggested_roles: string[];
  created_at: Date;
  updated_at: Date;
}

export interface UserCvResponse {
  id: string;
  name: string;
  original_file_name: string;
  file_url: string;
  mime_type: string;
  size_bytes: number;
  status: UserCv['status'];
  total_pages: number;
  created_at: Date;
  updated_at: Date;
}

export interface CvResearchSessionResponse {
  id: string;
  type: CvResearchType;
  target_source: CvResearchTargetSource;
  status: CvResearchSession['status'];
  phase: CvResearchSession['phase'];
  progress: number;
  progress_message: string | null;
  attempt: number;
  cv: UserCvResponse;
  cv_file_url: string;
  audit: CvAuditResponse | null;
  job_search_intent_id: string | null;
  job_suggestions: CvResearchSession['jobSuggestionsSnapshot'];
  target: {
    target_role: string | null;
    job_category_id: string | null;
    job_category_name: string | null;
    seniority_level_id: string | null;
    seniority_level_name: string | null;
    job_description: string | null;
    locations: string[];
  };
  created_at: Date;
  completed_at: Date | null;
  started_at: Date | null;
  updated_at: Date;
  error: string | null;
}

@Injectable()
export class CvService {
  constructor(
    @InjectQueue(CV_RESEARCH_QUEUE)
    private readonly researchQueue: Queue<CvResearchJobData>,
    @InjectRepository(CvAudit)
    private readonly cvAuditRepository: Repository<CvAudit>,
    @InjectRepository(CvAuditBatch)
    private readonly cvAuditBatchRepository: Repository<CvAuditBatch>,
    @InjectRepository(UserCv)
    private readonly userCvRepository: Repository<UserCv>,
    @InjectRepository(CvResearchSession)
    private readonly researchSessionRepository: Repository<CvResearchSession>,
    @InjectRepository(JobCategory)
    private readonly categoryRepository: Repository<JobCategory>,
    @InjectRepository(SeniorityLevel)
    private readonly seniorityRepository: Repository<SeniorityLevel>,
    private readonly pdfParserService: PdfParserService,
    private readonly aiEngineService: AiEngineService,
    private readonly r2StorageService: R2StorageService,
    private readonly jobResearchService: JobResearchService,
    private readonly progressService: ResearchProgressService,
    private readonly billingService: BillingService,
    private readonly activityService: ActivityService,
    private readonly dataSource: DataSource,
  ) {}

  async uploadUserCv(
    file: Express.Multer.File,
    dto: UploadUserCvDto,
    userId: string,
  ): Promise<UserCvResponse> {
    const parsedResume = await this.pdfParserService.parse(file);
    const cvId = randomUUID();
    const storageKey = this.r2StorageService.buildUserCvKey(
      userId,
      cvId,
      file.originalname,
    );
    const uploaded = await this.r2StorageService.uploadPdf({
      key: storageKey,
      body: file.buffer,
      contentType: file.mimetype,
      contentLength: file.size,
    });
    const cv = await this.userCvRepository.save(
      this.userCvRepository.create({
        id: cvId,
        userId,
        name: dto.name?.trim() || file.originalname,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        contentHash: this.createFileHash(file.buffer),
        storageProvider: 'cloudflare_r2',
        storageBucket: uploaded.bucket,
        storageKey: uploaded.key,
        storageEtag: uploaded.etag,
        status: 'ready',
        extractedText: parsedResume.text,
        parsedLines: parsedResume.lines,
        totalPages: parsedResume.totalPages,
        parserVersion: CURRENT_PDF_PARSER_VERSION,
        error: null,
      }),
    );
    void this.activityService.record({ subjectUserId: userId, actorUserId: userId, action: 'cv.uploaded', resourceType: 'user_cv', resourceId: cv.id, metadata: { file_name: cv.originalFileName, total_pages: cv.totalPages } }).catch(() => undefined);

    return this.toUserCvResponse(cv);
  }

  async listUserCvs(userId: string, query: UserCvListQueryDto) {
    const builder = this.userCvRepository
      .createQueryBuilder('cv')
      .where('cv.user_id = :userId', { userId })
      .orderBy('cv.created_at', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);
    const search = query.search?.trim();
    if (search) {
      builder.andWhere(
        '(cv.name ILIKE :search OR cv.original_file_name ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (query.status) {
      builder.andWhere('cv.status = :status', { status: query.status });
    }
    const [cvs, total] = await builder.getManyAndCount();

    return {
      items: await Promise.all(cvs.map((cv) => this.toUserCvResponse(cv))),
      meta: this.pageMeta(query.page, query.pageSize, total),
    };
  }

  async createCvReadUrl(userId: string, cvId: string) {
    const cv = await this.findUserCvOrThrow(userId, cvId);

    return {
      url: await this.r2StorageService.createReadUrl(cv.storageKey),
      expires_in: this.r2StorageService.getSignedUrlExpiresSeconds(),
    };
  }

  async getUserCvFile(userId: string, cvId: string) {
    const cv = await this.findUserCvOrThrow(userId, cvId);
    const file = await this.r2StorageService.getPdfBuffer(cv.storageKey);

    return {
      ...file,
      fileName: cv.originalFileName,
    };
  }

  async createQuickResearch(
    dto: CreateQuickCvResearchDto,
    userId: string,
  ): Promise<CvResearchSessionResponse> {
    const cv = await this.ensureCurrentCvParsing(
      await this.findUserCvOrThrow(userId, dto.userCvId),
    );
    return this.createResearchSession({
      userId,
      cv,
      type: 'quick',
      targetSource: 'ai_inferred',
      targetRole: null,
      jobCategoryId: null,
      jobCategoryName: null,
      seniorityLevelId: null,
      seniorityLevelName: null,
      jobDescription: null,
      locations: [],
    });
  }

  async createCustomResearch(
    dto: CreateCustomCvResearchDto,
    userId: string,
  ): Promise<CvResearchSessionResponse> {
    if (!dto.jobCategoryId && !dto.jobDescription?.trim() && !dto.targetRole) {
      throw new BadRequestException(
        'Research tùy chỉnh cần có ngành nghề, vị trí mục tiêu hoặc mô tả công việc.',
      );
    }

    const cv = await this.ensureCurrentCvParsing(
      await this.findUserCvOrThrow(userId, dto.userCvId),
    );
    const target = await this.resolveAuditTarget({
      jobCategoryId: dto.jobCategoryId,
      seniorityLevelId: dto.seniorityLevelId,
      targetRole: dto.targetRole,
    });
    const jobDescription = dto.jobDescription?.trim() || null;
    const locations = uniqueNonEmpty(dto.locations ?? []);

    return this.createResearchSession({
      userId,
      cv,
      type: 'custom',
      targetSource: jobDescription ? 'job_description' : 'job_category',
      targetRole: target.targetRole || dto.targetRole?.trim() || null,
      jobCategoryId: target.jobCategoryId,
      jobCategoryName: target.jobCategoryName,
      seniorityLevelId: target.seniorityLevelId,
      seniorityLevelName: target.seniorityLevelName,
      jobDescription,
      locations,
    });
  }

  async listResearchSessions(
    userId: string,
    query: ResearchSessionListQueryDto,
  ) {
    const builder = this.researchSessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.userCv', 'cv')
      .where('session.user_id = :userId', { userId })
      .orderBy('session.created_at', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);
    const search = query.search?.trim();
    if (search) {
      builder.andWhere(
        `(cv.name ILIKE :search
          OR cv.original_file_name ILIKE :search
          OR session.target_role ILIKE :search
          OR session.job_category_name ILIKE :search)`,
        { search: `%${search}%` },
      );
    }
    if (query.status) {
      builder.andWhere('session.status = :status', { status: query.status });
    }
    if (query.type) {
      builder.andWhere('session.type = :type', { type: query.type });
    }
    if (query.userCvId) {
      builder.andWhere('session.user_cv_id = :userCvId', {
        userCvId: query.userCvId,
      });
    }
    const [sessions, total] = await builder.getManyAndCount();

    return {
      items: await Promise.all(
        sessions.map((session) => this.toResearchResponse(session)),
      ),
      meta: this.pageMeta(query.page, query.pageSize, total),
    };
  }

  async getResearchSession(
    userId: string,
    sessionId: string,
  ): Promise<CvResearchSessionResponse> {
    const session = await this.researchSessionRepository.findOne({
      where: { id: sessionId, userId },
      relations: { userCv: true },
    });

    if (!session) {
      throw new BadRequestException('Phiên research CV không tồn tại.');
    }

    return this.toResearchResponse(session);
  }

  async retryResearchSession(
    userId: string,
    sessionId: string,
  ): Promise<CvResearchSessionResponse> {
    const session = await this.researchSessionRepository.findOne({
      where: { id: sessionId, userId },
      relations: { userCv: true },
    });

    if (!session) {
      throw new BadRequestException('Phiên research CV không tồn tại.');
    }
    if (session.status !== 'failed') {
      throw new BadRequestException(
        'Chỉ research đã thất bại mới có thể chạy lại.',
      );
    }

    // A completed audit is an immutable checkpoint. A failure after this point
    // resumes job collection instead of repeating the expensive CV review.
    if (session.auditSnapshot && session.jobSearchIntentId) {
      return this.retryResearchSessionJobs(userId, sessionId);
    }

    const nextAttempt = await this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`${userId}:${session.userCvId}:${session.type}`],
      );
      const repository = manager.getRepository(CvResearchSession);
      const current = await repository.findOneBy({ id: session.id, userId });
      if (!current || current.status !== 'failed') {
        throw new BadRequestException(
          'Chỉ research đã thất bại mới có thể chạy lại.',
        );
      }

      const active = await repository.findOne({
        where: {
          userId,
          userCvId: session.userCvId,
          type: session.type,
          status: In(['queued', 'processing']),
        },
      });
      if (active && active.id !== session.id) {
        throw new BadRequestException('CV này đã có phiên research đang chạy.');
      }

      if (current.jobSearchIntentId) {
        await manager.query(
          'UPDATE job_search_intents SET research_session_id = NULL WHERE id = $1',
          [current.jobSearchIntentId],
        );
      }

      const attempt = current.attempt + 1;
      await repository.update(session.id, {
        status: 'queued',
        phase: 'queued',
        progress: 0,
        progressMessage: 'Research đang được xếp hàng.',
        attempt,
        startedAt: null,
        heartbeatAt: () => 'CURRENT_TIMESTAMP',
        completedAt: null,
        cvAuditId: null,
        auditSnapshot: null,
        jobSearchIntentId: null,
        jobSuggestionsSnapshot: [],
        error: null,
        ...(current.type === 'quick'
          ? {
              targetRole: null,
              jobCategoryName: null,
              seniorityLevelName: null,
            }
          : {}),
      });
      await this.billingService.reserveResearch(manager, {
        userId,
        serviceCode: this.serviceCodeForResearch(current.type),
        sessionId: current.id,
        attempt,
      });
      return attempt;
    });

    const oldJob = await this.researchQueue.getJob(session.id);
    if (oldJob && (await oldJob.getState()) === 'active') {
      await this.progressService.fail(
        session.id,
        nextAttempt,
        'Worker trước vẫn đang hoạt động. Vui lòng chạy lại sau khi nó dừng.',
      );
      throw new BadRequestException('Worker trước vẫn đang hoạt động.');
    }
    if (oldJob) {
      await oldJob.remove();
    }
    await this.enqueueResearchSession(session.id, nextAttempt);
    await this.progressService.emitCurrent(session.id, nextAttempt);

    return this.getResearchSession(userId, session.id);
  }

  async retryResearchSessionJobs(
    userId: string,
    sessionId: string,
  ): Promise<CvResearchSessionResponse> {
    const session = await this.researchSessionRepository.findOne({
      where: { id: sessionId, userId },
      relations: { userCv: true },
    });

    if (!session) {
      throw new BadRequestException('Phiên research CV không tồn tại.');
    }

    if (!session.jobSearchIntentId) {
      throw new BadRequestException(
        'Phiên research này không có intent tìm việc để chạy lại.',
      );
    }

    const nextAttempt = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(CvResearchSession);
      const current = await repository.findOne({
        where: { id: session.id, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current?.jobSearchIntentId) {
        throw new BadRequestException('Phiên research này không còn intent tìm việc để chạy lại.');
      }
      if (['queued', 'processing'].includes(current.status)) {
        throw new BadRequestException('Phiên research này đang được xử lý.');
      }
      const attempt = current.attempt + 1;
      await repository.update(current.id, {
        status: 'processing', phase: 'job_matching', progress: 75,
        progressMessage: 'Đang thu thập và đối chiếu việc làm.', error: null,
        completedAt: null, jobSuggestionsSnapshot: [], attempt,
        heartbeatAt: () => 'CURRENT_TIMESTAMP',
      });
      await manager.query(
        'UPDATE job_search_intents SET research_session_attempt = $1 WHERE id = $2',
        [attempt, current.jobSearchIntentId],
      );
      return attempt;
    });

    try {
      await this.jobResearchService.retryIntent(
        session.jobSearchIntentId,
        userId,
      );
    } catch (error) {
      await this.progressService.fail(
        session.id,
        nextAttempt,
        this.formatError(error),
      );
      throw error;
    }

    const updated = await this.researchSessionRepository.findOneOrFail({
      where: { id: session.id },
      relations: { userCv: true },
    });

    return this.toResearchResponse(updated);
  }

  async createAudit(
    file: Express.Multer.File,
    dto: CreateCvAuditDto,
    userId: string,
  ): Promise<CvAuditResponse> {
    const target = await this.resolveAuditTarget(dto);
    const parsedResume = await this.pdfParserService.parse(file);

    return this.runAudit({
      userId,
      userCvId: null,
      researchSessionId: null,
      researchAttempt: null,
      researchType: null,
      fileName: file.originalname,
      parsedResume,
      target,
    });
  }

  async listAudits(userId: string, limit = 30): Promise<CvAuditHistoryItem[]> {
    const audits = await this.cvAuditRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 100),
    });

    return audits.map((audit) => ({
      audit_id: audit.id,
      file_name: audit.fileName,
      target_role: audit.targetRole,
      job_category_id: audit.jobCategoryId,
      job_category_name: audit.jobCategoryName,
      seniority_level_id: audit.seniorityLevelId,
      seniority_level_name: audit.seniorityLevelName,
      status: audit.status,
      overall_score: audit.overallScore,
      total_pages: audit.totalPages,
      suggested_keywords: audit.suggestedKeywords ?? [],
      suggested_roles: audit.suggestedRoles ?? [],
      created_at: audit.createdAt,
      updated_at: audit.updatedAt,
    }));
  }

  private async createResearchSession(input: {
    userId: string;
    cv: UserCv;
    type: CvResearchType;
    targetSource: CvResearchTargetSource;
    targetRole: string | null;
    jobCategoryId: string | null;
    jobCategoryName: string | null;
    seniorityLevelId: string | null;
    seniorityLevelName: string | null;
    jobDescription: string | null;
    locations: string[];
  }): Promise<CvResearchSessionResponse> {
    const creation = await this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`${input.userId}:${input.cv.id}:${input.type}`],
      );
      const repository = manager.getRepository(CvResearchSession);
      const active = await repository.findOne({
        where: {
          userId: input.userId,
          userCvId: input.cv.id,
          type: input.type,
          status: In(['queued', 'processing']),
        },
      });
      if (active) return { session: active, created: false };

      const session = await repository.save(
        repository.create({
          userId: input.userId,
          userCvId: input.cv.id,
          type: input.type,
          targetSource: input.targetSource,
          targetRole: input.targetRole,
          jobCategoryId: input.jobCategoryId,
          jobCategoryName: input.jobCategoryName,
          seniorityLevelId: input.seniorityLevelId,
          seniorityLevelName: input.seniorityLevelName,
          jobDescription: input.jobDescription,
          locations: input.locations,
          status: 'queued',
          phase: 'queued',
          progress: 0,
          progressMessage: 'Research đang được xếp hàng.',
          attempt: 1,
          startedAt: null,
          heartbeatAt: new Date(),
          auditSnapshot: null,
          jobSuggestionsSnapshot: [],
          error: null,
          completedAt: null,
        }),
      );
      await this.billingService.reserveResearch(manager, {
        userId: input.userId,
        serviceCode: this.serviceCodeForResearch(input.type),
        sessionId: session.id,
        attempt: session.attempt,
      });
      return { session, created: true };
    });
    const { session } = creation;

    session.userCv = input.cv;
    if (!creation.created) {
      return this.toResearchResponse(session);
    }

    void this.activityService.record({ subjectUserId: input.userId, actorUserId: input.userId, action: 'research.created', resourceType: 'cv_research_session', resourceId: session.id, metadata: { type: input.type, attempt: session.attempt } }).catch(() => undefined);

    try {
      await this.enqueueResearchSession(session.id, session.attempt);
      await this.progressService.emitCurrent(session.id, session.attempt);
      return this.toResearchResponse(session);
    } catch (error) {
      await this.progressService.fail(
        session.id,
        session.attempt,
        this.formatError(error),
      );
      throw error;
    }
  }

  private enqueueResearchSession(sessionId: string, attempt: number) {
    return this.researchQueue.add(
      CV_RESEARCH_JOB,
      { sessionId, attempt },
      {
        jobId: sessionId,
        attempts: 1,
        removeOnComplete: { age: 86_400, count: 1_000 },
        removeOnFail: { age: 86_400, count: 1_000 },
      },
    );
  }

  private serviceCodeForResearch(type: CvResearchType): ServiceCode {
    return type === 'quick' ? 'quick_research' : 'manual_research';
  }

  async processResearchSession(
    sessionId: string,
    expectedAttempt: number,
  ): Promise<void> {
    const session = await this.researchSessionRepository.findOne({
      where: { id: sessionId },
      relations: { userCv: true },
    });

    if (
      !session ||
      session.attempt !== expectedAttempt ||
      !['queued', 'processing'].includes(session.status)
    ) {
      return;
    }

    try {
      let targetRole = session.targetRole;
      let jobCategoryId = session.jobCategoryId;
      let jobCategoryName = session.jobCategoryName;
      let seniorityLevelId = session.seniorityLevelId;
      let seniorityLevelName = session.seniorityLevelName;
      let keywords: string[] = [];
      let searchQueries: string[] = [];

      if (session.type === 'quick') {
        await this.progressService.start(
          session.id,
          'target_inference',
          5,
          'Đang đọc CV và xác định vị trí mục tiêu.',
          expectedAttempt,
        );
        const [categories, seniorityLevels] = await Promise.all([
          this.categoryRepository.find({
            where: { isActive: true },
            relations: { aliases: true, seniorityRules: true },
            order: { displayOrder: 'ASC' },
          }),
          this.seniorityRepository.find({
            where: { isActive: true },
            order: { displayOrder: 'ASC' },
          }),
        ]);
        if (categories.length === 0) {
          throw new ServiceUnavailableException(
            'Taxonomy ngành nghề chưa được cấu hình.',
          );
        }

        const inferredTarget = await this.aiEngineService.inferCvTarget({
          resumeText: session.userCv.extractedText,
          headerLines: this.getHeaderLines(session.userCv),
          categories: categories.map((category) => ({
            code: category.code,
            name: category.name,
            description: category.description,
            aliases: category.aliases.map((alias) => alias.alias),
            allowedSeniorityCodes: category.seniorityRules
              .filter((rule) => rule.isSelectable)
              .map((rule) => rule.seniorityCode),
          })),
          seniorityLevels: seniorityLevels.map((level) => ({
            code: level.code,
            name: level.name,
            description: level.description,
            experienceMin: level.experienceMin,
            experienceMax: level.experienceMax,
          })),
        });
        if (inferredTarget.target_category_code === 'unsupported') {
          throw new BadRequestException(
            'CV không có định hướng phù hợp với taxonomy ngành CNTT hiện tại.',
          );
        }
        const inferredCategory = categories.find(
          (category) => category.code === inferredTarget.target_category_code,
        );
        if (!inferredCategory) {
          throw new BadGatewayException(
            `AI trả về category code không tồn tại trong taxonomy: ${inferredTarget.target_category_code}`,
          );
        }
        const inferredSeniority = inferredTarget.seniority_code
          ? seniorityLevels.find(
              (level) => level.code === inferredTarget.seniority_code,
            )
          : null;
        if (inferredTarget.seniority_code && !inferredSeniority) {
          throw new BadGatewayException(
            `AI trả về seniority code không tồn tại trong taxonomy: ${inferredTarget.seniority_code}`,
          );
        }
        if (
          inferredSeniority &&
          !inferredCategory.seniorityRules.some(
            (rule) =>
              rule.isSelectable &&
              rule.seniorityCode === inferredSeniority.code,
          )
        ) {
          throw new BadGatewayException(
            `AI trả về cấp bậc ${inferredSeniority.code} không phù hợp với category ${inferredCategory.code}`,
          );
        }

        targetRole = inferredTarget.target_role;
        jobCategoryId = inferredCategory.id;
        jobCategoryName = inferredCategory.name;
        seniorityLevelId = inferredSeniority?.id ?? null;
        seniorityLevelName = inferredSeniority?.name ?? null;
        keywords = inferredTarget.keywords;
        searchQueries = inferredTarget.search_queries;

        await this.updateActiveResearchAttempt(session.id, expectedAttempt, {
          targetRole,
          jobCategoryId,
          jobCategoryName,
          seniorityLevelId,
          seniorityLevelName,
          error: null,
        });
      }

      await this.progressService.update(
        session.id,
        {
          status: 'processing',
          phase: 'cv_audit',
          progress: 20,
          message: 'Đang đánh giá CV theo định hướng đã chọn.',
        },
        expectedAttempt,
      );

      const seniority = seniorityLevelId
        ? await this.seniorityRepository.findOneBy({
            id: seniorityLevelId,
            isActive: true,
          })
        : null;
      const audit = await this.createAuditFromStoredCv({
        userId: session.userId,
        cv: session.userCv,
        session,
        researchAttempt: expectedAttempt,
        type: session.type,
        target: {
          targetRole,
          jobCategoryId,
          jobCategoryName,
          seniorityLevelId,
          seniorityLevelName,
          seniorityDescription: seniority?.description ?? null,
          jobDescription: session.jobDescription,
        },
      });

      await this.updateActiveResearchAttempt(session.id, expectedAttempt, {
        cvAuditId: audit.audit_id,
        auditSnapshot: audit,
        error: null,
      });

      await this.progressService.update(
        session.id,
        {
          phase: 'job_matching',
          progress: 72,
          message: 'Đang chuẩn bị tìm kiếm việc làm từ kết quả CV.',
        },
        expectedAttempt,
      );

      const intent = await this.jobResearchService.createIntent(
        {
          auditId: audit.audit_id,
          targetRole: targetRole ?? undefined,
          seniorityLevelId: seniorityLevelId ?? undefined,
          seniorityLevelName: seniorityLevelName ?? undefined,
          keywords,
          searchQueries,
          locations: session.locations,
        },
        session.userId,
        {
          researchSessionId: session.id,
          researchSessionAttempt: expectedAttempt,
        },
      );

      await this.updateActiveResearchAttempt(session.id, expectedAttempt, {
        jobSearchIntentId: intent.intent.id,
        error: null,
      });
      await this.progressService.update(
        session.id,
        {
          phase: 'job_matching',
          progress: 75,
          message: 'Đang tìm việc phù hợp và kiểm tra từng kết quả.',
        },
        expectedAttempt,
      );
    } catch (error) {
      await this.progressService.fail(
        session.id,
        expectedAttempt,
        this.formatError(error),
      );
      throw error;
    }
  }

  private async createAuditFromStoredCv(input: {
    userId: string;
    cv: UserCv;
    session: CvResearchSession;
    researchAttempt: number;
    type: CvResearchType;
    target: {
      targetRole: string | null;
      jobCategoryId: string | null;
      jobCategoryName: string | null;
      seniorityLevelId: string | null;
      seniorityLevelName: string | null;
      seniorityDescription: string | null;
      jobDescription: string | null;
    };
  }): Promise<CvAuditResponse> {
    return this.runAudit({
      userId: input.userId,
      userCvId: input.cv.id,
      researchSessionId: input.session.id,
      researchAttempt: input.researchAttempt,
      researchType: input.type,
      fileName: input.cv.originalFileName,
      parsedResume: {
        text: input.cv.extractedText,
        lines: input.cv.parsedLines,
        totalPages: input.cv.totalPages,
      },
      target: input.target,
    });
  }

  private async runAudit(input: {
    userId: string;
    userCvId: string | null;
    researchSessionId: string | null;
    researchAttempt: number | null;
    researchType: CvResearchType | null;
    fileName: string;
    parsedResume: ParsedResume;
    target: {
      targetRole: string | null;
      jobCategoryId: string | null;
      jobCategoryName: string | null;
      seniorityLevelId: string | null;
      seniorityLevelName: string | null;
      seniorityDescription: string | null;
      jobDescription?: string | null;
    };
  }): Promise<CvAuditResponse> {
    const audit = await this.cvAuditRepository.save(
      this.cvAuditRepository.create({
        userId: input.userId,
        userCvId: input.userCvId,
        researchSessionId: input.researchSessionId,
        researchType: input.researchType,
        fileName: input.fileName,
        targetRole: input.target.targetRole,
        jobCategoryId: input.target.jobCategoryId,
        jobCategoryName: input.target.jobCategoryName,
        seniorityLevelId: input.target.seniorityLevelId,
        seniorityLevelName: input.target.seniorityLevelName,
        status: 'processing',
        extractedText: input.parsedResume.text,
        totalPages: input.parsedResume.totalPages,
      }),
    );

    try {
      const candidateHighlights =
        this.pdfParserService.buildCandidateHighlights(
          input.parsedResume.lines,
        );
      const result = await this.aiEngineService.analyzeCv({
        target: input.target,
        resumeText: input.parsedResume.text,
        candidateHighlights,
        onLineBatchStart: async ({ batchIndex, totalBatches, batch }) => {
          await this.cvAuditBatchRepository.upsert(
            {
              auditId: audit.id,
              batchIndex,
              totalBatches,
              status: 'processing',
              sourceLineIds: batch.map((line) => line.id),
              error: null,
            },
            ['auditId', 'batchIndex'],
          );
        },
        onLineBatchComplete: async ({
          batchIndex,
          completedBatches,
          totalBatches,
          result,
        }) => {
          await this.cvAuditBatchRepository.update(
            { auditId: audit.id, batchIndex },
            {
              status: 'completed',
              result,
              error: null,
            },
          );
          if (input.researchSessionId) {
            await this.progressService.update(
              input.researchSessionId,
              {
                phase: 'cv_audit',
                progress:
                  25 + Math.floor((completedBatches / totalBatches) * 30),
                message:
                  'Đang rà soát CV và kiểm tra bằng chứng cho từng góp ý.',
              },
              input.researchAttempt ?? undefined,
            );
          }
        },
        onLineBatchFailed: async ({ batchIndex, error }) => {
          await this.cvAuditBatchRepository.update(
            { auditId: audit.id, batchIndex },
            {
              status: 'failed',
              error: this.formatError(error),
            },
          );
        },
        onCoverageStart: async ({ totalBatches }) => {
          if (!input.researchSessionId) return;

          await this.progressService.update(
            input.researchSessionId,
            {
              phase: 'cv_audit',
              progress: 56,
              message:
                totalBatches > 0
                  ? 'Đang rà soát lại CV để tìm góp ý bị bỏ sót hoặc thiếu nhất quán.'
                  : 'Đánh giá CV đã hoàn tất. Đang chuẩn bị kết quả.',
            },
            input.researchAttempt ?? undefined,
          );
        },
        onCoverageBatchComplete: async ({ completedBatches, totalBatches }) => {
          if (!input.researchSessionId) return;

          await this.progressService.update(
            input.researchSessionId,
            {
              phase: 'cv_audit',
              progress: 55 + Math.floor((completedBatches / totalBatches) * 10),
              message:
                'Đang rà soát lại CV để tìm góp ý bị bỏ sót hoặc thiếu nhất quán.',
            },
            input.researchAttempt ?? undefined,
          );
        },
        onFinalSynthesisStart: async () => {
          if (!input.researchSessionId) return;

          await this.progressService.update(
            input.researchSessionId,
            {
              phase: 'cv_audit',
              progress: 66,
              message: 'Đang chuẩn bị điểm số và các góp ý ưu tiên.',
            },
            input.researchAttempt ?? undefined,
          );
        },
      });

      await this.cvAuditRepository.update(audit.id, {
        status: 'completed',
        overallScore: result.overall_score,
        feedback: result,
        suggestedKeywords: result.suggested_keywords,
        suggestedRoles: result.suggested_roles,
        suggestedJobs: result.suggested_jobs,
      });

      return {
        audit_id: audit.id,
        file_name: input.fileName,
        total_pages: input.parsedResume.totalPages,
        ...result,
      };
    } catch (error) {
      await this.cvAuditRepository.update(audit.id, {
        status: 'failed',
      });
      throw error;
    }
  }

  private formatError(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private async updateActiveResearchAttempt(
    sessionId: string,
    expectedAttempt: number,
    patch: QueryDeepPartialEntity<CvResearchSession>,
  ) {
    const result = await this.researchSessionRepository.update(
      {
        id: sessionId,
        attempt: expectedAttempt,
        status: In(['queued', 'processing']),
      },
      patch,
    );

    if (result.affected !== 1) {
      throw new Error(
        'Lần research này đã bị thay thế hoặc không còn hoạt động.',
      );
    }
  }

  private async resolveAuditTarget(dto: CreateCvAuditDto) {
    const category = dto.jobCategoryId
      ? await this.categoryRepository.findOneBy({ id: dto.jobCategoryId })
      : null;
    const seniority = dto.seniorityLevelId
      ? await this.seniorityRepository.findOneBy({
          id: dto.seniorityLevelId,
          isActive: true,
        })
      : null;

    if (dto.jobCategoryId && !category) {
      throw new BadRequestException('Ngành nghề đã chọn không tồn tại.');
    }

    if (dto.seniorityLevelId && !seniority) {
      throw new BadRequestException('Cấp bậc đã chọn không tồn tại.');
    }

    const categoryName = category?.name.trim() ?? null;
    const seniorityName = seniority?.name?.trim() || null;
    const targetRole = [seniorityName, categoryName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      targetRole: targetRole || dto.targetRole?.trim() || null,
      jobCategoryId: category?.id ?? null,
      jobCategoryName: categoryName,
      seniorityLevelId: seniority?.id ?? null,
      seniorityLevelName: seniorityName,
      seniorityDescription: seniority?.description ?? null,
      jobDescription: null,
    };
  }

  private async findUserCvOrThrow(userId: string, cvId: string) {
    const cv = await this.userCvRepository.findOneBy({ id: cvId, userId });

    if (!cv) {
      throw new BadRequestException('CV không tồn tại.');
    }

    if (cv.status !== 'ready') {
      throw new BadRequestException('CV chưa sẵn sàng để research.');
    }

    return cv;
  }

  private async ensureCurrentCvParsing(cv: UserCv) {
    if (cv.parserVersion >= CURRENT_PDF_PARSER_VERSION) {
      return cv;
    }

    const storedFile = await this.r2StorageService.getPdfBuffer(cv.storageKey);
    const parsedResume = await this.pdfParserService.parseBuffer(
      storedFile.body,
    );

    cv.extractedText = parsedResume.text;
    cv.parsedLines = parsedResume.lines;
    cv.totalPages = parsedResume.totalPages;
    cv.parserVersion = CURRENT_PDF_PARSER_VERSION;
    cv.error = null;

    return this.userCvRepository.save(cv);
  }

  private async toUserCvResponse(cv: UserCv): Promise<UserCvResponse> {
    return {
      id: cv.id,
      name: cv.name,
      original_file_name: cv.originalFileName,
      file_url: await this.r2StorageService.createReadUrl(cv.storageKey),
      mime_type: cv.mimeType,
      size_bytes: cv.sizeBytes,
      status: cv.status,
      total_pages: cv.totalPages,
      created_at: cv.createdAt,
      updated_at: cv.updatedAt,
    };
  }

  private async toResearchResponse(
    session: CvResearchSession,
  ): Promise<CvResearchSessionResponse> {
    const cv =
      session.userCv ??
      (await this.userCvRepository.findOneByOrFail({
        id: session.userCvId,
        userId: session.userId,
      }));

    return {
      id: session.id,
      type: session.type,
      target_source: session.targetSource,
      status: session.status,
      phase: session.phase,
      progress: session.progress,
      progress_message: session.progressMessage,
      attempt: session.attempt,
      cv: await this.toUserCvResponse(cv),
      cv_file_url: await this.r2StorageService.createReadUrl(cv.storageKey),
      audit: session.auditSnapshot
        ? {
            audit_id: session.cvAuditId ?? session.id,
            file_name: cv.originalFileName,
            total_pages: cv.totalPages,
            ...session.auditSnapshot,
          }
        : null,
      job_search_intent_id: session.jobSearchIntentId,
      job_suggestions: session.jobSuggestionsSnapshot,
      target: {
        target_role: session.targetRole,
        job_category_id: session.jobCategoryId,
        job_category_name: session.jobCategoryName,
        seniority_level_id: session.seniorityLevelId,
        seniority_level_name: session.seniorityLevelName,
        job_description: session.jobDescription,
        locations: session.locations,
      },
      created_at: session.createdAt,
      completed_at: session.completedAt,
      started_at: session.startedAt,
      updated_at: session.updatedAt,
      error: session.error,
    };
  }

  private createFileHash(buffer: Buffer) {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private pageMeta(page: number, pageSize: number, total: number) {
    return {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
    };
  }

  private getHeaderLines(cv: UserCv) {
    return cv.parsedLines
      .filter((line) => line.pageNumber === 1)
      .map((line) => line.text)
      .filter(Boolean)
      .slice(0, 20);
  }
}
