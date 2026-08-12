import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { DataSource, In, Repository } from 'typeorm';

import { AiEngineService } from '../ai/ai-engine.service';
import { BillingService } from '../billing/billing.service';
import { UserCv } from '../cv/entities/user-cv.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ResearchProgressGateway } from '../research-realtime/research-progress.gateway';
import type { ExternalJobResearchListQueryDto } from './dto/external-job-research.dto';
import { ExternalJobResearch, type ExternalJobResearchInput, type ExternalJobResearchSource } from './entities/external-job-research.entity';
import { InvalidRecruitmentContentError } from './errors/invalid-recruitment-content.error';
import { FirecrawlRecruitmentService } from './firecrawl-recruitment.service';
import { EXTERNAL_JOB_RESEARCH_JOB, EXTERNAL_JOB_RESEARCH_QUEUE, type ExternalJobResearchJobData } from './types/external-job-research-queue.type';

@Injectable()
export class ExternalJobResearchService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectQueue(EXTERNAL_JOB_RESEARCH_QUEUE) private readonly queue: Queue<ExternalJobResearchJobData>,
    @InjectRepository(ExternalJobResearch) private readonly researches: Repository<ExternalJobResearch>,
    @InjectRepository(UserCv) private readonly cvs: Repository<UserCv>,
    private readonly ai: AiEngineService,
    private readonly billing: BillingService,
    private readonly firecrawl: FirecrawlRecruitmentService,
    private readonly gateway: ResearchProgressGateway,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, input: { userCvId: string; sourceKind: ExternalJobResearchSource; inputKind: ExternalJobResearchInput; content: string; contentResolved?: boolean }) {
    const content = input.content.trim().slice(0, 50_000);
    if (input.sourceKind === 'jd' && content.length < 200) throw new BadRequestException('Nội dung JD quá ngắn để đánh giá.');
    const research = await this.dataSource.transaction(async (manager) => {
      const cv = await manager.getRepository(UserCv).findOneBy({ id: input.userCvId, userId });
      if (!cv || cv.status !== 'ready' || !cv.extractedText.trim()) throw new BadRequestException('CV chưa sẵn sàng để đánh giá.');
      const entity = manager.getRepository(ExternalJobResearch).create({
        userId, userCvId: cv.id, cvContentHash: cv.contentHash, sourceKind: input.sourceKind, inputKind: input.inputKind,
        status: 'queued', phase: 'queued', progress: 0, progressMessage: 'Đang xếp hàng đánh giá.', attempt: 1,
        score: null, verdict: null, confidence: null, result: null, error: null, failureOrigin: null, startedAt: null, completedAt: null,
      });
      const saved = await manager.getRepository(ExternalJobResearch).save(entity);
      await this.billing.reserveService(manager, {
        userId,
        serviceCode: input.sourceKind === 'link' ? 'external_link_research' : 'external_jd_research',
        subjectType: 'external_job_research', subjectId: saved.id, attempt: saved.attempt,
      });
      return saved;
    });
    try { await this.enqueue(research, content, input.contentResolved); }
    catch (error) { await this.fail(research.id, research.attempt, this.errorMessage(error), true); throw error; }
    await this.publish(research);
    return this.toView(research);
  }

  async createFromLink(userId: string, userCvId: string, url: string) {
    const resolved = await this.firecrawl.resolveFacebookLink(url);
    return this.create(userId, { userCvId, sourceKind: 'link', inputKind: 'url', content: resolved.content, contentResolved: resolved.resolved });
  }

  async retry(userId: string, id: string) {
    const current = await this.researches.findOneBy({ id, userId });
    if (!current) throw new NotFoundException('Phiên đánh giá không tồn tại.');
    if (current.status !== 'failed') throw new BadRequestException('Chỉ phiên thất bại mới có thể chạy lại.');
    const previousJob = await this.queue.getJob(`external-job-${current.id}-${current.attempt}`);
    if (!previousJob?.data.content) throw new BadRequestException('Dữ liệu tạm của phiên đã hết hạn. Hãy tạo phiên mới.');
    const research = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ExternalJobResearch);
      const locked = await repository.findOne({ where: { id, userId }, lock: { mode: 'pessimistic_write' } });
      if (!locked || locked.status !== 'failed') throw new BadRequestException('Phiên không thể chạy lại.');
      const cv = await manager.getRepository(UserCv).findOneBy({ id: locked.userCvId, userId });
      if (!cv || cv.status !== 'ready' || cv.contentHash !== locked.cvContentHash) throw new BadRequestException('CV đã thay đổi. Hãy tạo phiên mới.');
      locked.attempt += 1; locked.status = 'queued'; locked.phase = 'queued'; locked.progress = 0;
      locked.progressMessage = 'Đang xếp hàng đánh giá lại.'; locked.score = null; locked.verdict = null;
      locked.confidence = null; locked.result = null; locked.error = null; locked.failureOrigin = null; locked.startedAt = null; locked.completedAt = null;
      const saved = await repository.save(locked);
      await this.billing.reserveService(manager, {
        userId, serviceCode: saved.sourceKind === 'link' ? 'external_link_research' : 'external_jd_research',
        subjectType: 'external_job_research', subjectId: saved.id, attempt: saved.attempt,
      });
      return saved;
    });
    try { await this.enqueue(research, previousJob.data.content, previousJob.data.contentResolved); }
    catch (error) { await this.fail(research.id, research.attempt, this.errorMessage(error), true); throw error; }
    await this.publish(research);
    return this.toView(research);
  }

  async process(id: string, attempt: number, payload: ExternalJobResearchJobData) {
    const research = await this.researches.findOneBy({ id, attempt });
    if (!research || research.status === 'completed') return;
    try {
      await this.update(research, 'reading', 15, research.sourceKind === 'link' ? 'Đang đọc nội dung từ liên kết.' : 'Đang đọc nội dung JD.');
      const content = research.sourceKind === 'link' && !payload.contentResolved ? await this.firecrawl.scrape(payload.content) : payload.content;
      await this.update(research, 'validating', 30, 'Đang kiểm tra nội dung tuyển dụng.');
      this.assertRecruitmentContent(content);
      const cv = await this.cvs.findOneBy({ id: research.userCvId, userId: research.userId });
      if (!cv || cv.status !== 'ready' || cv.contentHash !== research.cvContentHash) throw new Error('CV đã thay đổi hoặc không còn sẵn sàng.');
      await this.update(research, 'analyzing', 45, 'AI đang đối chiếu yêu cầu với bằng chứng trong CV.');
      const result = await this.ai.analyzeJobFit({
        resumeText: cv.extractedText,
        job: { title: 'Nội dung tuyển dụng đã cung cấp', categoryName: null, seniorityNames: [], locations: [], jobType: null, skills: [], description: content.slice(0, 25_000), requirements: content.slice(0, 25_000) },
      });
      const score = Math.max(0, Math.min(100, Math.round(result.dimensions.reduce((sum, item) => sum + item.score, 0))));
      research.status = 'completed'; research.phase = 'completed'; research.progress = 100;
      research.progressMessage = 'Đã hoàn tất đánh giá độ phù hợp.'; research.score = score;
      research.verdict = result.verdict; research.confidence = result.confidence;
      research.result = { ...result, score }; research.error = null; research.failureOrigin = null; research.completedAt = new Date();
      const saved = await this.researches.save(research);
      await this.billing.settleService('external_job_research', id, attempt);
      await this.publish(saved);
      return saved;
    } catch (error) {
      const invalidInput = error instanceof InvalidRecruitmentContentError;
      await this.fail(id, attempt, this.errorMessage(error), !invalidInput);
      if (!invalidInput) throw error;
    }
  }

  async list(userId: string, query: ExternalJobResearchListQueryDto) {
    const builder = this.researches.createQueryBuilder('research').leftJoin(UserCv, 'cv', 'cv.id = research.user_cv_id').where('research.user_id = :userId', { userId });
    if (query.status) builder.andWhere('research.status = :status', { status: query.status });
    if (query.sourceKind) builder.andWhere('research.source_kind = :sourceKind', { sourceKind: query.sourceKind });
    if (query.userCvId) builder.andWhere('research.user_cv_id = :userCvId', { userCvId: query.userCvId });
    if (query.search?.trim()) builder.andWhere('(cv.name ILIKE :search OR cv.original_file_name ILIKE :search)', { search: `%${query.search.trim()}%` });
    const [items, total] = await builder.orderBy('research.created_at', 'DESC').skip((query.page - 1) * query.pageSize).take(query.pageSize).getManyAndCount();
    const cvs = items.length ? await this.cvs.findBy({ id: In([...new Set(items.map((item) => item.userCvId))]) }) : [];
    const cvById = new Map(cvs.map((cv) => [cv.id, { id: cv.id, name: cv.name, original_file_name: cv.originalFileName, total_pages: cv.totalPages }]));
    return { items: items.map((item) => this.toView(item, cvById.get(item.userCvId) ?? null)), meta: { page: query.page, page_size: query.pageSize, total, total_pages: Math.ceil(total / query.pageSize) } };
  }

  async get(userId: string, id: string) {
    const research = await this.researches.findOneBy({ id, userId });
    if (!research) throw new NotFoundException('Phiên đánh giá không tồn tại.');
    const cv = await this.cvs.findOneBy({ id: research.userCvId, userId });
    return this.toView(research, cv ? { id: cv.id, name: cv.name, original_file_name: cv.originalFileName, total_pages: cv.totalPages } : null);
  }

  async fail(id: string, attempt: number, error: string, refundable: boolean) {
    const research = await this.researches.findOneBy({ id, attempt });
    if (!research || research.status === 'completed' || research.status === 'failed') return;
    research.status = 'failed'; research.phase = 'failed'; research.progressMessage = refundable
      ? 'Không thể hoàn tất do lỗi hệ thống. Credit đã được hoàn lại.'
      : 'Nội dung đã cung cấp không đủ thông tin tuyển dụng. Credit không được hoàn lại.';
    research.error = error; research.failureOrigin = refundable ? 'system' : 'user_input'; research.completedAt = new Date();
    const saved = await this.researches.save(research);
    if (refundable) await this.billing.refundService('external_job_research', id, attempt, error);
    else await this.billing.settleService('external_job_research', id, attempt);
    await this.publish(saved);
  }

  private assertRecruitmentContent(content: string) {
    const normalized = content.toLocaleLowerCase('vi');
    const signals = ['mô tả công việc', 'công việc', 'yêu cầu', 'trách nhiệm', 'ứng viên', 'tuyển dụng', 'tuyển ', 'vị trí', 'kinh nghiệm', 'kỹ năng', 'mức lương', 'phúc lợi', 'địa điểm', 'gửi cv', 'inbox', 'job description', 'requirements', 'responsibilities', 'we are hiring', 'hiring', 'apply'];
    if (content.trim().length < 250 || signals.filter((signal) => normalized.includes(signal)).length < 2) throw new InvalidRecruitmentContentError();
  }

  private async update(research: ExternalJobResearch, phase: 'reading' | 'validating' | 'analyzing', progress: number, message: string) {
    research.status = 'processing'; research.phase = phase; research.progress = progress; research.progressMessage = message; research.startedAt ??= new Date();
    await this.publish(await this.researches.save(research));
  }

  private enqueue(research: ExternalJobResearch, content: string, contentResolved = false) {
    return this.queue.add(EXTERNAL_JOB_RESEARCH_JOB, { researchId: research.id, attempt: research.attempt, sourceKind: research.sourceKind, inputKind: research.inputKind, content, contentResolved }, {
      jobId: `external-job-${research.id}-${research.attempt}`, attempts: 1,
      removeOnComplete: true,
      removeOnFail: { age: 86_400, count: 500 },
    });
  }

  private async publish(research: ExternalJobResearch) {
    this.gateway.emitExternalJobResearchToUser(research.userId, this.toView(research));
    const notification = await this.notifications.syncExternalJobResearch(research);
    this.gateway.emitNotificationToUser(research.userId, notification);
  }

  private toView(research: ExternalJobResearch, cv?: Record<string, unknown> | null) {
    return { id: research.id, user_cv_id: research.userCvId, source_kind: research.sourceKind, input_kind: research.inputKind, status: research.status, phase: research.phase, progress: research.progress, progress_message: research.progressMessage, attempt: research.attempt, score: research.score, verdict: research.verdict, confidence: research.confidence, result: research.result, cv, error: research.error, can_retry: research.failureOrigin === 'system', created_at: research.createdAt, completed_at: research.completedAt, updated_at: research.updatedAt };
  }

  private errorMessage(error: unknown) { return error instanceof Error ? error.message : String(error); }
}
