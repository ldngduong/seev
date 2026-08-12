import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';
import { ActivityModule } from '../activity/activity.module';
import { CrawlerModule } from '../crawler/crawler.module';
import { JobCategory } from '../job-category/entities/job-category.entity';
import { SeniorityLevel } from '../seniority/entities/seniority-level.entity';
import { ResearchRealtimeModule } from '../research-realtime/research-realtime.module';
import { StorageModule } from '../storage/storage.module';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { CvAuditBatch } from './entities/cv-audit-batch.entity';
import { CvAudit } from './entities/cv-audit.entity';
import { CvResearchSession } from './entities/cv-research-session.entity';
import { UserCv } from './entities/user-cv.entity';
import { PdfParserService } from './pdf-parser.service';
import { CvResearchProcessor } from './processors/cv-research.processor';
import { CV_RESEARCH_QUEUE } from './types/cv-research-queue.type';

@Module({
  imports: [
    AiModule,
    BillingModule,
    ActivityModule,
    CrawlerModule,
    ResearchRealtimeModule,
    StorageModule,
    BullModule.registerQueue({ name: CV_RESEARCH_QUEUE }),
    BullBoardModule.forFeature({
      name: CV_RESEARCH_QUEUE,
      adapter: BullMQAdapter,
    }),
    TypeOrmModule.forFeature([
      CvAudit,
      CvAuditBatch,
      CvResearchSession,
      JobCategory,
      SeniorityLevel,
      UserCv,
    ]),
  ],
  controllers: [CvController],
  providers: [CvService, PdfParserService, CvResearchProcessor],
})
export class CvModule {}
