import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AiEngineService } from '../ai/ai-engine.service';
import type { CvAuditResult } from '../ai/schemas/cv-audit-result.schema';
import { JobFamilyCategory } from '../job-category/entities/job-family-category.entity';
import { SeniorityLevel } from '../seniority/entities/seniority-level.entity';
import { CreateCvAuditDto } from './dto/create-cv-audit.dto';
import { CvAuditBatch } from './entities/cv-audit-batch.entity';
import { CvAudit } from './entities/cv-audit.entity';
import { PdfParserService } from './pdf-parser.service';

export interface CvAuditResponse extends CvAuditResult {
  audit_id: string;
  file_name: string;
  total_pages: number;
}

@Injectable()
export class CvService {
  constructor(
    @InjectRepository(CvAudit)
    private readonly cvAuditRepository: Repository<CvAudit>,
    @InjectRepository(CvAuditBatch)
    private readonly cvAuditBatchRepository: Repository<CvAuditBatch>,
    @InjectRepository(JobFamilyCategory)
    private readonly categoryRepository: Repository<JobFamilyCategory>,
    @InjectRepository(SeniorityLevel)
    private readonly seniorityRepository: Repository<SeniorityLevel>,
    private readonly pdfParserService: PdfParserService,
    private readonly aiEngineService: AiEngineService,
  ) {}

  async createAudit(
    file: Express.Multer.File,
    dto: CreateCvAuditDto,
  ): Promise<CvAuditResponse> {
    const target = await this.resolveAuditTarget(dto);
    const parsedResume = await this.pdfParserService.parse(file);
    const audit = await this.cvAuditRepository.save(
      this.cvAuditRepository.create({
        fileName: file.originalname,
        targetRole: target.targetRole,
        jobCategoryId: target.jobCategoryId,
        jobCategoryName: target.jobCategoryName,
        seniorityLevelId: target.seniorityLevelId,
        seniorityLevelName: target.seniorityLevelName,
        status: 'processing',
        extractedText: parsedResume.text,
        totalPages: parsedResume.totalPages,
      }),
    );

    try {
      const candidateHighlights = this.pdfParserService.buildCandidateHighlights(
        parsedResume.lines,
      );
      const result = await this.aiEngineService.analyzeCv({
        target,
        resumeText: parsedResume.text,
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
        file_name: file.originalname,
        total_pages: parsedResume.totalPages,
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
    };
  }
}
