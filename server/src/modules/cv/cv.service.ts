import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';

import { AiEngineService } from '../ai/ai-engine.service';
import type {
  CvAuditResult,
  CvTargetInference,
} from '../ai/schemas/cv-audit-result.schema';
import { CreateJobResearchIntentDto } from '../crawler/dto/create-job-research-intent.dto';
import { JobResearchService } from '../crawler/job-research.service';
import { JobFamilyCategory } from '../job-category/entities/job-family-category.entity';
import { SeniorityLevel } from '../seniority/entities/seniority-level.entity';
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
import { PdfParserService } from './pdf-parser.service';

export interface CvAuditResponse extends CvAuditResult {
  audit_id: string;
  file_name: string;
  total_pages: number;
}

export interface CvAuditHistoryItem {
  audit_id: string;
  file_name: string;
  target_role: string | null;
  job_category_id: number | null;
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
  cv: UserCvResponse;
  cv_file_url: string;
  audit: CvAuditResponse | null;
  job_search_intent_id: string | null;
  job_suggestions: CvResearchSession['jobSuggestionsSnapshot'];
  target: {
    target_role: string | null;
    job_category_id: number | null;
    job_category_name: string | null;
    seniority_level_id: string | null;
    seniority_level_name: string | null;
    job_description: string | null;
  };
  created_at: Date;
  completed_at: Date | null;
  error: string | null;
}

@Injectable()
export class CvService {
  constructor(
    @InjectRepository(CvAudit)
    private readonly cvAuditRepository: Repository<CvAudit>,
    @InjectRepository(CvAuditBatch)
    private readonly cvAuditBatchRepository: Repository<CvAuditBatch>,
    @InjectRepository(UserCv)
    private readonly userCvRepository: Repository<UserCv>,
    @InjectRepository(CvResearchSession)
    private readonly researchSessionRepository: Repository<CvResearchSession>,
    @InjectRepository(JobFamilyCategory)
    private readonly categoryRepository: Repository<JobFamilyCategory>,
    @InjectRepository(SeniorityLevel)
    private readonly seniorityRepository: Repository<SeniorityLevel>,
    private readonly pdfParserService: PdfParserService,
    private readonly aiEngineService: AiEngineService,
    private readonly r2StorageService: R2StorageService,
    private readonly jobResearchService: JobResearchService,
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
        error: null,
      }),
    );

    return this.toUserCvResponse(cv);
  }

  async listUserCvs(userId: string): Promise<UserCvResponse[]> {
    const cvs = await this.userCvRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return Promise.all(cvs.map((cv) => this.toUserCvResponse(cv)));
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
    const cv = await this.findUserCvOrThrow(userId, dto.userCvId);
    const inferredTarget = await this.aiEngineService.inferCvTarget({
      resumeText: cv.extractedText,
      headerLines: this.getHeaderLines(cv),
    });

    return this.createResearchSession({
      userId,
      cv,
      type: 'quick',
      targetSource: 'ai_inferred',
      targetRole: inferredTarget.target_role,
      jobCategoryId: null,
      jobCategoryName: inferredTarget.target_category_hint || null,
      seniorityLevelId: null,
      seniorityLevelName: inferredTarget.seniority_hint || null,
      seniorityDescription: null,
      jobDescription: null,
      extraKeywords: inferredTarget.keywords,
      searchQueries: inferredTarget.search_queries,
      inference: inferredTarget,
    });
  }

  async createCustomResearch(
    dto: CreateCustomCvResearchDto,
    userId: string,
  ): Promise<CvResearchSessionResponse> {
    if (!dto.jobCategoryId && !dto.jobDescription?.trim() && !dto.targetRole) {
      throw new BadRequestException(
        'Custom research requires a job category, target role, or job description.',
      );
    }

    const cv = await this.findUserCvOrThrow(userId, dto.userCvId);
    const target = await this.resolveAuditTarget({
      jobCategoryId: dto.jobCategoryId,
      seniorityLevelId: dto.seniorityLevelId,
      targetRole: dto.targetRole,
    });
    const jobDescription = dto.jobDescription?.trim() || null;

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
      seniorityDescription: target.seniorityDescription,
      jobDescription,
      extraKeywords: [],
      searchQueries: [],
    });
  }

  async listResearchSessions(
    userId: string,
    limit = 30,
  ): Promise<CvResearchSessionResponse[]> {
    const sessions = await this.researchSessionRepository.find({
      where: { userId },
      relations: { userCv: true },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 100),
    });

    return Promise.all(sessions.map((session) => this.toResearchResponse(session)));
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
      throw new BadRequestException('CV research session does not exist.');
    }

    return this.toResearchResponse(session);
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
      throw new BadRequestException('CV research session does not exist.');
    }

    if (!session.jobSearchIntentId) {
      throw new BadRequestException(
        'This research session does not have a job-search intent to retry.',
      );
    }

    await this.jobResearchService.retryIntent(session.jobSearchIntentId, userId);
    await this.researchSessionRepository.update(session.id, {
      status: 'processing',
      error: null,
      completedAt: null,
      jobSuggestionsSnapshot: [],
    });

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
      researchType: null,
      fileName: file.originalname,
      parsedResume,
      target,
    });
  }

  async listAudits(
    userId: string,
    limit = 30,
  ): Promise<CvAuditHistoryItem[]> {
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
    jobCategoryId: number | null;
    jobCategoryName: string | null;
    seniorityLevelId: string | null;
    seniorityLevelName: string | null;
    seniorityDescription: string | null;
    jobDescription: string | null;
    extraKeywords: string[];
    searchQueries: string[];
    inference?: CvTargetInference;
  }): Promise<CvResearchSessionResponse> {
    const session = await this.researchSessionRepository.save(
      this.researchSessionRepository.create({
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
        status: 'processing',
        auditSnapshot: null,
        jobSuggestionsSnapshot: [],
        error: null,
        completedAt: null,
      }),
    );

    try {
      const audit = await this.createAuditFromStoredCv({
        userId: input.userId,
        cv: input.cv,
        session,
        type: input.type,
        target: {
          targetRole: input.targetRole,
          jobCategoryId: input.jobCategoryId,
          jobCategoryName: input.jobCategoryName,
          seniorityLevelId: input.seniorityLevelId,
          seniorityLevelName: input.seniorityLevelName,
          seniorityDescription: input.seniorityDescription,
          jobDescription: input.jobDescription,
        },
      });
      const jobIntentPayload: CreateJobResearchIntentDto = {
        auditId: audit.audit_id,
        targetRole: input.targetRole ?? undefined,
        seniorityLevelId: input.seniorityLevelId ?? undefined,
        seniorityLevelName: input.seniorityLevelName ?? undefined,
        keywords: input.extraKeywords,
        searchQueries: input.searchQueries,
      };
      const jobIntent = await this.jobResearchService.createIntent(
        jobIntentPayload,
        input.userId,
        { researchSessionId: session.id },
      );

      await this.researchSessionRepository.update(session.id, {
        cvAuditId: audit.audit_id,
        jobSearchIntentId: jobIntent.intent.id,
        auditSnapshot: audit,
        status: 'processing',
        completedAt: null,
        error: null,
      });

      const completedSession = await this.researchSessionRepository.findOneOrFail({
        where: { id: session.id },
        relations: { userCv: true },
      });

      return this.toResearchResponse(completedSession);
    } catch (error) {
      await this.researchSessionRepository.update(session.id, {
        status: 'failed',
        error: this.formatError(error),
        completedAt: new Date(),
      });
      throw error;
    }
  }

  private async createAuditFromStoredCv(input: {
    userId: string;
    cv: UserCv;
    session: CvResearchSession;
    type: CvResearchType;
    target: {
      targetRole: string | null;
      jobCategoryId: number | null;
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
    researchType: CvResearchType | null;
    fileName: string;
    parsedResume: ParsedResume;
    target: {
      targetRole: string | null;
      jobCategoryId: number | null;
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
      const candidateHighlights = this.pdfParserService.buildCandidateHighlights(
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
        onLineBatchComplete: async ({ batchIndex, result }) => {
          await this.cvAuditBatchRepository.update(
            { auditId: audit.id, batchIndex },
            {
              status: 'completed',
              result,
              error: null,
            },
          );
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
      throw new BadRequestException('Selected job category does not exist.');
    }

    if (dto.seniorityLevelId && !seniority) {
      throw new BadRequestException('Selected seniority level does not exist.');
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
      throw new BadRequestException('CV does not exist.');
    }

    if (cv.status !== 'ready') {
      throw new BadRequestException('CV is not ready for research.');
    }

    return cv;
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
    const cv = session.userCv ?? (await this.userCvRepository.findOneByOrFail({
      id: session.userCvId,
      userId: session.userId,
    }));

    return {
      id: session.id,
      type: session.type,
      target_source: session.targetSource,
      status: session.status,
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
      },
      created_at: session.createdAt,
      completed_at: session.completedAt,
      error: session.error,
    };
  }

  private createFileHash(buffer: Buffer) {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private getHeaderLines(cv: UserCv) {
    return cv.parsedLines
      .filter((line) => line.pageNumber === 1)
      .map((line) => line.text)
      .filter(Boolean)
      .slice(0, 20);
  }
}
