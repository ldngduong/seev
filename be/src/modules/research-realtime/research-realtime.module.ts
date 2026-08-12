import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { ActivityModule } from '../activity/activity.module';
import { CvResearchSession } from '../cv/entities/cv-research-session.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ResearchProgressGateway } from './research-progress.gateway';
import { ResearchProgressService } from './research-progress.service';

@Module({
  imports: [
    AuthModule,
    BillingModule,
    ActivityModule,
    NotificationsModule,
    TypeOrmModule.forFeature([CvResearchSession]),
  ],
  providers: [ResearchProgressGateway, ResearchProgressService],
  exports: [ResearchProgressService, ResearchProgressGateway],
})
export class ResearchRealtimeModule {}
