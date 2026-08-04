import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  CvResearchSession,
  type CvResearchPhase,
  type CvResearchStatus,
} from '../cv/entities/cv-research-session.entity';
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

  complete(
    sessionId: string,
    expectedAttempt: number,
    message = 'Research completed.',
  ) {
    return this.update(
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
  }

  fail(sessionId: string, expectedAttempt: number, error: string) {
    return this.update(
      sessionId,
      {
        status: 'failed',
        phase: 'failed',
        message: 'Research failed. You can retry this session.',
        error,
        completed: true,
      },
      expectedAttempt,
    );
  }

  async emitCurrent(sessionId: string, expectedAttempt?: number) {
    const session = await this.sessions.findOneBy({
      id: sessionId,
      ...(expectedAttempt === undefined ? {} : { attempt: expectedAttempt }),
    });
    if (!session) return null;

    const event = this.toEvent(session);
    this.gateway.emitToUser(session.userId, event);
    return event;
  }

  private toEvent(session: CvResearchSession): ResearchProgressEvent {
    return {
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
