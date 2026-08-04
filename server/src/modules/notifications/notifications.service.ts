import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { CvResearchSession } from '../cv/entities/cv-research-session.entity';
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
      order: { updatedAt: 'DESC' },
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
    });

    return this.notifications.save(notification);
  }

  private toNotificationStatus(
    status: CvResearchSession['status'],
  ): NotificationStatus {
    if (status === 'completed') return 'completed';
    if (status === 'failed') return 'failed';
    return 'running';
  }

  private titleFor(status: NotificationStatus) {
    if (status === 'completed') return 'Research completed';
    if (status === 'failed') return 'Research needs attention';
    return 'Research in progress';
  }

  private defaultMessageFor(status: NotificationStatus) {
    if (status === 'completed') return 'Your CV research is ready to review.';
    if (status === 'failed') return 'The research stopped before completion.';
    return 'Your CV is being reviewed.';
  }
}
