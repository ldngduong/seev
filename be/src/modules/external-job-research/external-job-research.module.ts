import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';
import { UserCv } from '../cv/entities/user-cv.entity';
import { PdfParserService } from '../cv/pdf-parser.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ResearchRealtimeModule } from '../research-realtime/research-realtime.module';
import { ExternalJobResearch } from './entities/external-job-research.entity';
import { ExternalJobDocumentService } from './external-job-document.service';
import { ExternalJobResearchController } from './external-job-research.controller';
import { ExternalJobResearchService } from './external-job-research.service';
import { FirecrawlRecruitmentService } from './firecrawl-recruitment.service';
import { ExternalJobResearchProcessor } from './processors/external-job-research.processor';
import { EXTERNAL_JOB_RESEARCH_QUEUE } from './types/external-job-research-queue.type';

@Module({
  imports: [AiModule, BillingModule, NotificationsModule, ResearchRealtimeModule, TypeOrmModule.forFeature([ExternalJobResearch, UserCv]), BullModule.registerQueue({ name: EXTERNAL_JOB_RESEARCH_QUEUE }), BullBoardModule.forFeature({ name: EXTERNAL_JOB_RESEARCH_QUEUE, adapter: BullMQAdapter })],
  controllers: [ExternalJobResearchController],
  providers: [ExternalJobResearchService, ExternalJobResearchProcessor, ExternalJobDocumentService, FirecrawlRecruitmentService, PdfParserService],
})
export class ExternalJobResearchModule {}
