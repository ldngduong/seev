import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivityService } from './activity.service';
import { ActivityLog } from './entities/activity-log.entity';

@Module({ imports: [TypeOrmModule.forFeature([ActivityLog])], providers: [ActivityService], exports: [ActivityService] })
export class ActivityModule {}
