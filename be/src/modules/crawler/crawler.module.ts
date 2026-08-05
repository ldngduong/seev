import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CvResearchSession } from '../cv/entities/cv-research-session.entity';
import { CvAudit } from '../cv/entities/cv-audit.entity';
import { JobFamilyCategory } from '../job-category/entities/job-family-category.entity';
import { SeniorityLevel } from '../seniority/entities/seniority-level.entity';
import { ResearchRealtimeModule } from '../research-realtime/research-realtime.module';
import { IndeedConnector } from './connectors/indeed.connector';
import { TopCvConnector } from './connectors/topcv.connector';
import { VietnamWorksConnector } from './connectors/vietnamworks.connector';
import { CrawlerController } from './crawler.controller';
import { CrawlerHttpService } from './crawler-http.service';
import { JobCrawlRun } from './entities/job-crawl-run.entity';
import { JobIntentMatch } from './entities/job-intent-match.entity';
import { JobPost } from './entities/job-post.entity';
import { JobSearchIntent } from './entities/job-search-intent.entity';
import { JobResearchService } from './job-research.service';
import { JobResearchProcessor } from './processors/job-research.processor';
import { JOB_RESEARCH_QUEUE } from './types/job-source.type';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CvAudit,
      CvResearchSession,
      JobFamilyCategory,
      SeniorityLevel,
      JobSearchIntent,
      JobCrawlRun,
      JobPost,
      JobIntentMatch,
    ]),
    ResearchRealtimeModule,
    BullModule.registerQueue({
      name: JOB_RESEARCH_QUEUE,
    }),
    BullBoardModule.forFeature({
      name: JOB_RESEARCH_QUEUE,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [CrawlerController],
  providers: [
    CrawlerHttpService,
    TopCvConnector,
    VietnamWorksConnector,
    IndeedConnector,
    JobResearchService,
    JobResearchProcessor,
  ],
  exports: [JobResearchService],
})
export class CrawlerModule {}
