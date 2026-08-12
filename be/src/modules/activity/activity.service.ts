import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ActivityLog } from './entities/activity-log.entity';

@Injectable()
export class ActivityService {
  constructor(@InjectRepository(ActivityLog) private readonly logs: Repository<ActivityLog>) {}
  record(input: Partial<ActivityLog> & Pick<ActivityLog, 'action'>) {
    return this.logs.save(this.logs.create({
      subjectUserId: input.subjectUserId ?? null, actorUserId: input.actorUserId ?? null,
      action: input.action, resourceType: input.resourceType ?? null, resourceId: input.resourceId ?? null,
      status: input.status ?? 'success', ipAddress: input.ipAddress ?? null, userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? {},
    }));
  }
  listForUser(userId: string, limit = 100) {
    return this.logs.find({ where: { subjectUserId: userId }, order: { createdAt: 'DESC' }, take: Math.min(Math.max(limit, 1), 200) });
  }
  listAll(limit = 100) {
    return this.logs.find({ order: { createdAt: 'DESC' }, take: Math.min(Math.max(limit, 1), 200) });
  }
}
