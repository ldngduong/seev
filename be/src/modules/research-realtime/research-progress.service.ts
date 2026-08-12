import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  CvResearchSession,
  type CvResearchPhase,
  type CvResearchStatus,
} from '../cv/entities/cv-research-session.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { BillingService } from '../billing/billing.service';
import { ActivityService } from '../activity/activity.service';
import { ResearchProgressGateway } from './research-progress.gateway';
import type { ResearchProgressEvent } from './types/research-progress.type';

interface ProgressUpdate {
  status?: CvResearchStatus;
  phase?: CvResearchPhase;
  progress?: number;
  message?: string | null;
  error?: string | null;
  started?: boolean;
  completed?: boolean;
}

@Injectable()
export class ResearchProgressService {
  constructor(
    @InjectRepository(CvResearchSession)
    private readonly sessions: Repository<CvResearchSession>,
    private readonly gateway: ResearchProgressGateway,
    private readonly notifications: NotificationsService,
    private readonly billing: BillingService,
    private readonly activity: ActivityService,
  ) {}

  async update(
    sessionId: string,
    update: ProgressUpdate,
    expectedAttempt?: number,
  ) {
    const progress =
      update.progress === undefined
        ? undefined
        : Math.max(0, Math.min(100, Math.round(update.progress)));

    const result = await this.sessions
      .createQueryBuilder()
      .update(CvResearchSession)
      .set({
        ...(update.status ? { status: update.status } : {}),
        ...(update.phase ? { phase: update.phase } : {}),
        ...(progress === undefined ? {} : { progress }),
        ...(update.message === undefined
          ? {}
          : { progressMessage: update.message }),
        ...(update.error === undefined ? {} : { error: update.error }),
        heartbeatAt: () => 'CURRENT_TIMESTAMP',
        ...(update.started ? { startedAt: () => 'CURRENT_TIMESTAMP' } : {}),
        ...(update.completed ? { completedAt: () => 'CURRENT_TIMESTAMP' } : {}),
      })
      .where('id = :sessionId', { sessionId })
      .andWhere('status IN (:...activeStatuses)', {
        activeStatuses: ['queued', 'processing'],
      })
      .andWhere(
        expectedAttempt === undefined ? 'TRUE' : 'attempt = :expectedAttempt',
        expectedAttempt === undefined ? {} : { expectedAttempt },
      )
      .execute();

    if (result.affected !== 1) return null;
    return this.emitCurrent(sessionId, expectedAttempt);
  }

  start(
    sessionId: string,
    phase: CvResearchPhase,
    progress: number,
    message: string,
    expectedAttempt: number,
  ) {
    return this.update(
      sessionId,
      {
        status: 'processing',
        phase,
        progress,
        message,
        error: null,
        started: true,
      },
      expectedAttempt,
    );
  }

  async complete(
    sessionId: string,
    expectedAttempt: number,
    message = 'Research hoàn tất.',
  ) {
    const event = await this.update(
      sessionId,
      {
        status: 'completed',
        phase: 'completed',
        progress: 100,
        message,
        error: null,
        completed: true,
      },
      expectedAttempt,
    );
    if (event) await this.billing.settleResearch(sessionId, expectedAttempt);
    if (event) void this.activity.record({ subjectUserId: event.user_id, actorUserId: event.user_id, action: 'research.completed', resourceType: 'cv_research_session', resourceId: sessionId, metadata: { attempt: expectedAttempt } }).catch(() => undefined);
    return event;
  }

  async fail(sessionId: string, expectedAttempt: number, error: string) {
    const event = await this.update(
      sessionId,
      {
        status: 'failed',
        phase: 'failed',
        message: 'Research thất bại. Bạn có thể chạy lại phiên này.',
        error,
        completed: true,
      },
      expectedAttempt,
    );
    await this.billing.refundResearch(sessionId, expectedAttempt, error);
    if (event) void this.activity.record({ subjectUserId: event.user_id, actorUserId: event.user_id, action: 'research.failed', resourceType: 'cv_research_session', resourceId: sessionId, status: 'failed', metadata: { attempt: expectedAttempt, error } }).catch(() => undefined);
    return event;
  }

  async emitCurrent(sessionId: string, expectedAttempt?: number) {
    const session = await this.sessions.findOneBy({
      id: sessionId,
      ...(expectedAttempt === undefined ? {} : { attempt: expectedAttempt }),
    });
    if (!session) return null;

    const event = this.toEvent(session);
    const notification = await this.notifications.syncResearch(session);
    this.gateway.emitToUser(session.userId, event);
    this.gateway.emitNotificationToUser(session.userId, notification);
    return event;
  }

  private toEvent(session: CvResearchSession): ResearchProgressEvent {
    return {
      user_id: session.userId,
      session_id: session.id,
      user_cv_id: session.userCvId,
      status: session.status,
      phase: session.phase,
      progress: session.progress,
      message: session.progressMessage,
      attempt: session.attempt,
      error: session.error,
      updated_at: session.updatedAt,
    };
  }
}
