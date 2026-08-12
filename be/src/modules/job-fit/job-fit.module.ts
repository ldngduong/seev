import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';
import { UserCv } from '../cv/entities/user-cv.entity';
import { JobPostDetail } from '../crawler/entities/job-post-detail.entity';
import { JobPost } from '../crawler/entities/job-post.entity';
import { ResearchRealtimeModule } from '../research-realtime/research-realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JobFitAnalysis } from './entities/job-fit-analysis.entity';
import { JobFitController } from './job-fit.controller';
import { JobFitService } from './job-fit.service';
import { JobFitProcessor } from './processors/job-fit.processor';
import { JOB_FIT_QUEUE } from './types/job-fit-queue.type';

@Module({
  imports: [AiModule, BillingModule, ResearchRealtimeModule, NotificationsModule, TypeOrmModule.forFeature([JobFitAnalysis, UserCv, JobPost, JobPostDetail]), BullModule.registerQueue({ name: JOB_FIT_QUEUE }), BullBoardModule.forFeature({ name: JOB_FIT_QUEUE, adapter: BullMQAdapter })],
  controllers: [JobFitController], providers: [JobFitService, JobFitProcessor], exports: [JobFitService],
})
export class JobFitModule {}
