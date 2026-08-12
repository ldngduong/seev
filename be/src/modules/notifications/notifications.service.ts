import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { CvResearchSession } from '../cv/entities/cv-research-session.entity';
import type { JobFitAnalysis } from '../job-fit/entities/job-fit-analysis.entity';
import type { ExternalJobResearch } from '../external-job-research/entities/external-job-research.entity';
import type { NotificationQueryDto } from './dto/notification-query.dto';
import {
  UserNotification,
  type NotificationStatus,
} from './entities/user-notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(UserNotification)
    private readonly notifications: Repository<UserNotification>,
  ) {}

  async list(userId: string, query: NotificationQueryDto) {
    const where = {
      userId,
      ...(query.status === 'unread' ? { readAt: IsNull() } : {}),
    };
    const [items, total] = await this.notifications.findAndCount({
      where,
      order: { occurredAt: 'DESC', createdAt: 'DESC' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    const unread = await this.notifications.count({
      where: { userId, readAt: IsNull() },
    });

    return {
      items,
      meta: {
        page: query.page,
        page_size: query.pageSize,
        total,
        total_pages: Math.ceil(total / query.pageSize),
        unread,
      },
    };
  }

  async markRead(userId: string, id: string) {
    await this.notifications.update(
      { id, userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return this.notifications.findOneByOrFail({ id, userId });
  }

  async markAllRead(userId: string) {
    await this.notifications.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { success: true };
  }

  async syncResearch(session: CvResearchSession) {
    const status = this.toNotificationStatus(session.status);
    const existing = await this.notifications.findOneBy({
      userId: session.userId,
      resourceType: 'cv_research_session',
      resourceId: session.id,
    });
    const notification = this.notifications.create({
      ...existing,
      userId: session.userId,
      resourceType: 'cv_research_session',
      resourceId: session.id,
      status,
      title: this.titleFor(status),
      message: session.progressMessage ?? this.defaultMessageFor(status),
      href: `/research-history/${session.id}`,
      readAt: status === 'running' ? existing?.readAt ?? null : null,
      occurredAt: new Date(),
    });

    return this.notifications.save(notification);
  }

  async syncJobFit(analysis: JobFitAnalysis) {
    const status = this.toNotificationStatus(analysis.status);
    const existing = await this.notifications.findOneBy({
      userId: analysis.userId,
      resourceType: 'job_fit_analysis',
      resourceId: analysis.id,
    });
    const job = analysis.jobSnapshot as { title?: string };
    const notification = this.notifications.create({
      ...existing,
      userId: analysis.userId,
      resourceType: 'job_fit_analysis',
      resourceId: analysis.id,
      status,
      title:
        status === 'completed'
          ? 'Đánh giá việc làm hoàn tất'
          : status === 'failed'
            ? 'Đánh giá việc làm cần xem lại'
            : 'Đang đánh giá việc làm',
      message:
        analysis.progressMessage ??
        (job.title
          ? `Đang đối chiếu CV với ${job.title}.`
          : 'Đang đối chiếu CV với yêu cầu việc làm.'),
      href: `/jobs/${analysis.jobPostId ?? String(analysis.jobSnapshot.id ?? 'expired')}/fit/${analysis.id}`,
      readAt: status === 'running' ? existing?.readAt ?? null : null,
      occurredAt: new Date(),
    });
    return this.notifications.save(notification);
  }

  async syncExternalJobResearch(research: ExternalJobResearch) {
    const status = this.toNotificationStatus(research.status);
    const existing = await this.notifications.findOneBy({
      userId: research.userId,
      resourceType: 'external_job_research',
      resourceId: research.id,
    });
    const notification = this.notifications.create({
      ...existing,
      userId: research.userId,
      resourceType: 'external_job_research',
      resourceId: research.id,
      status,
      title: status === 'completed' ? 'Đánh giá nội dung tuyển dụng hoàn tất' : status === 'failed' ? 'Đánh giá nội dung tuyển dụng thất bại' : 'Đang đánh giá nội dung tuyển dụng',
      message: research.progressMessage ?? 'Đang đối chiếu CV với nội dung tuyển dụng.',
      href: `/research-history/external/${research.id}`,
      readAt: status === 'running' ? existing?.readAt ?? null : null,
      occurredAt: new Date(),
    });
    return this.notifications.save(notification);
  }

  private toNotificationStatus(
    status: CvResearchSession['status'] | JobFitAnalysis['status'] | ExternalJobResearch['status'],
  ): NotificationStatus {
    if (status === 'completed') return 'completed';
    if (status === 'failed') return 'failed';
    return 'running';
  }

  private titleFor(status: NotificationStatus) {
    if (status === 'completed') return 'Research hoàn tất';
    if (status === 'failed') return 'Research cần xem lại';
    return 'Research đang chạy';
  }

  private defaultMessageFor(status: NotificationStatus) {
    if (status === 'completed') return 'Bản research CV của bạn đã sẵn sàng để xem.';
    if (status === 'failed') return 'Research dừng trước khi hoàn tất.';
    return 'CV của bạn đang được phân tích.';
  }
}
