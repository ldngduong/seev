import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { DataSource, Repository } from 'typeorm';

import { AiEngineService } from '../ai/ai-engine.service';
import { BillingService } from '../billing/billing.service';
import { UserCv } from '../cv/entities/user-cv.entity';
import { JobPostDetail } from '../crawler/entities/job-post-detail.entity';
import { JobPost } from '../crawler/entities/job-post.entity';
import {
  sanitizeJobContent,
  sanitizeJobSkills,
} from '../crawler/utils/job-content-sanitizer';
import { ResearchProgressGateway } from '../research-realtime/research-progress.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { JobFitAnalysis } from './entities/job-fit-analysis.entity';
import type { JobFitListQueryDto } from './dto/job-fit-list-query.dto';
import { JOB_FIT_JOB, JOB_FIT_QUEUE, type JobFitJobData } from './types/job-fit-queue.type';

const SCORING_VERSION = 1;

@Injectable()
export class JobFitService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectQueue(JOB_FIT_QUEUE) private readonly queue: Queue<JobFitJobData>,
    @InjectRepository(JobFitAnalysis) private readonly analyses: Repository<JobFitAnalysis>,
    @InjectRepository(UserCv) private readonly cvs: Repository<UserCv>,
    @InjectRepository(JobPost) private readonly jobs: Repository<JobPost>,
    @InjectRepository(JobPostDetail) private readonly details: Repository<JobPostDetail>,
    private readonly ai: AiEngineService,
    private readonly billing: BillingService,
    private readonly progressGateway: ResearchProgressGateway,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, jobPostId: string, userCvId: string) {
    const created = await this.dataSource.transaction(async (manager) => {
      await manager.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`${userId}:${userCvId}:${jobPostId}`]);
      const [cv, job, detail] = await Promise.all([
        manager.getRepository(UserCv).findOneBy({ id: userCvId, userId }),
        manager.getRepository(JobPost).findOneBy({ id: jobPostId }),
        manager.getRepository(JobPostDetail).findOneBy({ jobPostId }),
      ]);
      if (!cv || cv.status !== 'ready' || !cv.extractedText.trim()) throw new BadRequestException('CV chưa sẵn sàng để đánh giá.');
      if (!job || job.expiredAt <= new Date()) throw new NotFoundException('Việc làm không tồn tại hoặc đã hết hạn.');
      if (!detail || detail.qualityScore < 0.8) throw new BadRequestException('Việc làm chưa có đủ mô tả và yêu cầu đáng tin cậy để đánh giá.');

      const existing = await manager.getRepository(JobFitAnalysis).findOne({
        where: { userId, userCvId, jobPostId, cvContentHash: cv.contentHash, jobDetailHash: detail.contentHash, scoringVersion: SCORING_VERSION },
        order: { createdAt: 'DESC' },
      });
      if (existing && ['queued', 'processing', 'completed'].includes(existing.status)) return { analysis: existing, enqueue: false, reused: existing.status === 'completed' };

      const analysis = manager.getRepository(JobFitAnalysis).create({
        userId, userCvId, jobPostId, cvContentHash: cv.contentHash, jobDetailHash: detail.contentHash,
        scoringVersion: SCORING_VERSION, status: 'queued', phase: 'queued', progress: 0,
        progressMessage: 'Đang xếp hàng đánh giá độ phù hợp.', attempt: 1,
        score: null, verdict: null, confidence: null, result: null, error: null,
        startedAt: null, completedAt: null,
        jobSnapshot: {
          id: job.id,
          title: job.title,
          company_name: job.companyName,
          source: job.source,
          source_url: job.sourceUrl,
          category_name: job.jobCategoryName,
          locations: job.locations,
          job_type: job.jobType,
          experience: job.experience,
          salary_text: job.salaryText,
          skills: sanitizeJobSkills(job.skills),
          description: sanitizeJobContent(detail.description),
          requirements: sanitizeJobContent(detail.requirements),
          expired_at: job.expiredAt.toISOString(),
        },
      });
      const saved = await manager.getRepository(JobFitAnalysis).save(analysis);
      await this.billing.reserveService(manager, { userId, serviceCode: 'job_fit_analysis', subjectType: 'job_fit', subjectId: saved.id, attempt: saved.attempt });
      return { analysis: saved, enqueue: true, reused: false };
    });

    if (created.enqueue) {
      try {
        await this.enqueue(created.analysis.id, created.analysis.attempt);
      } catch (error) {
        await this.fail(created.analysis.id, created.analysis.attempt, error instanceof Error ? error.message : String(error));
        throw error;
      }
    }
    const notification = await this.notifications.syncJobFit(created.analysis);
    this.progressGateway.emitNotificationToUser(created.analysis.userId, notification);
    return { ...this.toView(created.analysis), reused: created.reused };
  }

  async retry(userId: string, id: string) {
    const analysis = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(JobFitAnalysis);
      const current = await repository.findOne({
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current) throw new NotFoundException('Kết quả đánh giá không tồn tại.');
      if (current.status !== 'failed') throw new BadRequestException('Chỉ đánh giá thất bại mới có thể chạy lại.');
      if (!current.jobPostId) throw new BadRequestException('Việc làm đã hết hạn hoặc không còn tồn tại.');

      const [cv, job, detail] = await Promise.all([
        manager.getRepository(UserCv).findOneBy({ id: current.userCvId, userId }),
        manager.getRepository(JobPost).findOneBy({ id: current.jobPostId }),
        manager.getRepository(JobPostDetail).findOneBy({ jobPostId: current.jobPostId }),
      ]);
      if (!cv || cv.status !== 'ready' || cv.contentHash !== current.cvContentHash) {
        throw new BadRequestException('CV đã thay đổi hoặc không còn sẵn sàng. Hãy tạo đánh giá mới.');
      }
      if (!job || job.expiredAt <= new Date()) throw new BadRequestException('Việc làm đã hết hạn hoặc không còn tồn tại.');
      if (!detail || detail.qualityScore < 0.8 || detail.contentHash !== current.jobDetailHash) {
        throw new BadRequestException('Nội dung việc làm đã thay đổi hoặc không còn đủ dữ liệu. Hãy tạo đánh giá mới.');
      }

      const attempt = current.attempt + 1;
      current.attempt = attempt;
      current.status = 'queued';
      current.phase = 'queued';
      current.progress = 0;
      current.progressMessage = 'Đang xếp hàng đánh giá lại độ phù hợp.';
      current.score = null;
      current.verdict = null;
      current.confidence = null;
      current.result = null;
      current.error = null;
      current.startedAt = null;
      current.completedAt = null;
      const saved = await repository.save(current);
      await this.billing.reserveService(manager, {
        userId,
        serviceCode: 'job_fit_analysis',
        subjectType: 'job_fit',
        subjectId: saved.id,
        attempt,
      });
      return saved;
    });

    try {
      await this.enqueue(analysis.id, analysis.attempt);
    } catch (error) {
      await this.fail(analysis.id, analysis.attempt, error instanceof Error ? error.message : String(error));
      throw error;
    }
    const notification = await this.notifications.syncJobFit(analysis);
    this.progressGateway.emitJobFitToUser(analysis.userId, this.toView(analysis));
    this.progressGateway.emitNotificationToUser(analysis.userId, notification);
    return this.toView(analysis);
  }

  async list(userId: string, query: JobFitListQueryDto) {
    const builder = this.analyses.createQueryBuilder('analysis')
      .leftJoin(UserCv, 'cv', 'cv.id = analysis.user_cv_id')
      .where('analysis.user_id = :userId', { userId });
    if (query.status) builder.andWhere('analysis.status = :status', { status: query.status });
    if (query.userCvId) builder.andWhere('analysis.user_cv_id = :userCvId', { userCvId: query.userCvId });
    const search = query.search?.trim();
    if (search) {
      builder.andWhere(`(analysis.job_snapshot->>'title' ILIKE :search OR analysis.job_snapshot->>'company_name' ILIKE :search OR cv.name ILIKE :search OR cv.original_file_name ILIKE :search)`, { search: `%${search}%` });
    }
    builder.orderBy('analysis.created_at', 'DESC').skip((query.page - 1) * query.pageSize).take(query.pageSize);
    const [items, total] = await builder.getManyAndCount();
    return {
      items: items.map((item) => this.toView(item)),
      meta: { page: query.page, page_size: query.pageSize, total, total_pages: Math.ceil(total / query.pageSize) },
    };
  }

  async get(userId: string, id: string) {
    const analysis = await this.analyses.findOneBy({ id, userId });
    if (!analysis) throw new NotFoundException('Kết quả đánh giá không tồn tại.');
    const [cv, job, detail, seniorityRows] = await Promise.all([
      this.cvs.findOneBy({ id: analysis.userCvId, userId }),
      analysis.jobPostId ? this.jobs.findOneBy({ id: analysis.jobPostId }) : null,
      analysis.jobPostId ? this.details.findOneBy({ jobPostId: analysis.jobPostId }) : null,
      analysis.jobPostId ? this.jobs.query(`SELECT sl.display_name FROM job_post_seniority_levels jsl JOIN seniority_levels sl ON sl.id=jsl.seniority_level_id WHERE jsl.job_post_id=$1 ORDER BY jsl.is_primary DESC, jsl.confidence DESC`, [analysis.jobPostId]) as Promise<Array<{ display_name: string }>> : Promise.resolve([]),
    ]);
    return this.toView(analysis, {
      cv: cv ? { id: cv.id, name: cv.name, original_file_name: cv.originalFileName, total_pages: cv.totalPages } : null,
      job: job && detail ? {
        id: job.id, title: job.title, company_name: job.companyName, source: job.source,
        source_url: job.sourceUrl, category_name: job.jobCategoryName, locations: job.locations,
        job_type: job.jobType, experience: job.experience, salary_text: job.salaryText,
        skills: sanitizeJobSkills(job.skills), description: sanitizeJobContent(detail.description), requirements: sanitizeJobContent(detail.requirements),
        seniority_levels: seniorityRows.map((row) => row.display_name),
        expired_at: job.expiredAt.toISOString(),
      } : null,
    });
  }

  async process(id: string, attempt: number) {
    const analysis = await this.analyses.findOneBy({ id, attempt });
    if (!analysis || analysis.status === 'completed') return;
    if (!analysis.jobPostId) {
      await this.fail(id, attempt, 'Việc làm đã hết hạn trước khi đánh giá bắt đầu.');
      return;
    }
    await this.updateProgress(analysis, 'validating', 15, 'Đang kiểm tra CV và dữ liệu việc làm.');
    try {
      const [cv, job, detail, seniorityRows] = await Promise.all([
        this.cvs.findOneBy({ id: analysis.userCvId, userId: analysis.userId }),
        this.jobs.findOneBy({ id: analysis.jobPostId }),
        this.details.findOneBy({ jobPostId: analysis.jobPostId }),
        this.jobs.query(`SELECT sl.display_name FROM job_post_seniority_levels jsl JOIN seniority_levels sl ON sl.id=jsl.seniority_level_id WHERE jsl.job_post_id=$1 ORDER BY jsl.is_primary DESC, jsl.confidence DESC`, [analysis.jobPostId]) as Promise<Array<{ display_name: string }>>,
      ]);
      if (!cv || !job || !detail || detail.contentHash !== analysis.jobDetailHash || cv.contentHash !== analysis.cvContentHash) throw new Error('CV hoặc nội dung việc làm đã thay đổi. Vui lòng tạo đánh giá mới.');
      await this.updateProgress(analysis, 'analyzing', 35, 'AI đang đối chiếu từng yêu cầu với bằng chứng trong CV.');
      const result = await this.ai.analyzeJobFit({
        resumeText: cv.extractedText,
        job: { title: job.title, categoryName: job.jobCategoryName, seniorityNames: seniorityRows.map((row) => row.display_name), locations: job.locations, jobType: job.jobType, skills: sanitizeJobSkills(job.skills), description: sanitizeJobContent(detail.description), requirements: sanitizeJobContent(detail.requirements) },
      });
      const score = Math.max(0, Math.min(100, Math.round(result.dimensions.reduce((sum, item) => sum + item.score, 0))));
      analysis.status = 'completed'; analysis.phase = 'completed'; analysis.progress = 100;
      analysis.progressMessage = 'Đã hoàn tất đánh giá độ phù hợp.'; analysis.score = score;
      analysis.verdict = result.verdict; analysis.confidence = result.confidence;
      analysis.result = { ...result, score }; analysis.error = null; analysis.completedAt = new Date();
      const saved = await this.analyses.save(analysis);
      await this.billing.settleService('job_fit', analysis.id, attempt);
      this.progressGateway.emitJobFitToUser(analysis.userId, this.toView(saved));
      const notification = await this.notifications.syncJobFit(saved);
      this.progressGateway.emitNotificationToUser(analysis.userId, notification);
      return saved;
    } catch (error) {
      await this.fail(id, attempt, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async fail(id: string, attempt: number, error: string) {
    const analysis = await this.analyses.findOneBy({ id, attempt });
    if (!analysis || analysis.status === 'completed' || analysis.status === 'failed') return;
    analysis.status = 'failed'; analysis.phase = 'failed'; analysis.progressMessage = 'Không thể hoàn tất đánh giá. Credit đã được hoàn lại.';
    analysis.error = error; analysis.completedAt = new Date();
    const saved = await this.analyses.save(analysis);
    await this.billing.refundService('job_fit', id, attempt, error);
    this.progressGateway.emitJobFitToUser(analysis.userId, this.toView(saved));
    const notification = await this.notifications.syncJobFit(saved);
    this.progressGateway.emitNotificationToUser(analysis.userId, notification);
  }

  private async updateProgress(analysis: JobFitAnalysis, phase: 'validating' | 'analyzing', progress: number, message: string) {
    analysis.status = 'processing'; analysis.phase = phase; analysis.progress = progress; analysis.progressMessage = message;
    analysis.startedAt ??= new Date();
    const saved = await this.analyses.save(analysis);
    this.progressGateway.emitJobFitToUser(analysis.userId, this.toView(saved));
    const notification = await this.notifications.syncJobFit(saved);
    this.progressGateway.emitNotificationToUser(analysis.userId, notification);
  }

  private enqueue(analysisId: string, attempt: number) {
    return this.queue.add(JOB_FIT_JOB, { analysisId, attempt }, {
      jobId: `job-fit-${analysisId}-${attempt}`,
      attempts: 1,
      removeOnComplete: { age: 86400, count: 1000 },
      removeOnFail: { age: 86400, count: 1000 },
    });
  }

  private toView(analysis: JobFitAnalysis, options: { cv?: Record<string, unknown> | null; job?: Record<string, unknown> | null } = {}) {
    const job = options.job ?? analysis.jobSnapshot;
    const expiredAt = typeof job.expired_at === 'string' ? job.expired_at : null;
    return { id: analysis.id, user_cv_id: analysis.userCvId, job_post_id: analysis.jobPostId ?? job.id, status: analysis.status, phase: analysis.phase, progress: analysis.progress, progress_message: analysis.progressMessage, score: analysis.score, verdict: analysis.verdict, confidence: analysis.confidence, result: analysis.result, cv: options.cv, job: { ...job, is_expired: expiredAt ? new Date(expiredAt) <= new Date() : analysis.jobPostId === null }, error: analysis.error, created_at: analysis.createdAt, completed_at: analysis.completedAt, updated_at: analysis.updatedAt };
  }
}
