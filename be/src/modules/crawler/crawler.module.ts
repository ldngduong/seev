import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CvResearchSession } from '../cv/entities/cv-research-session.entity';
import { CvAudit } from '../cv/entities/cv-audit.entity';
import { AiModule } from '../ai/ai.module';
import { JobCategoryAlias } from '../job-category/entities/job-category-alias.entity';
import { CategorySeniorityLevel } from '../job-category/entities/category-seniority-level.entity';
import { JobCategory } from '../job-category/entities/job-category.entity';
import { SourceCategoryMapping } from '../job-category/entities/source-category-mapping.entity';
import { SeniorityLevel } from '../seniority/entities/seniority-level.entity';
import { ResearchRealtimeModule } from '../research-realtime/research-realtime.module';
import { CategoryCrawlService } from './category-crawl.service';
import { CrawlNotifyService } from './crawl-notify.service';
import { CrawlerController } from './crawler.controller';
import { CrawlerHttpService } from './crawler-http.service';
import { JobCrawlRun } from './entities/job-crawl-run.entity';
import { JobIntentMatch } from './entities/job-intent-match.entity';
import { JobPost } from './entities/job-post.entity';
import { JobPostSeniorityLevel } from './entities/job-post-seniority-level.entity';
import { JobSearchIntent } from './entities/job-search-intent.entity';
import { JobResearchService } from './job-research.service';
import { JobResearchProcessor } from './processors/job-research.processor';
import { CategoryCrawlProcessor } from './processors/category-crawl.processor';
import { CATEGORY_CRAWL_QUEUE } from './types/category-crawl.type';
import { JOB_RESEARCH_QUEUE } from './types/job-source.type';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CvAudit,
      CvResearchSession,
      JobCategory,
      JobCategoryAlias,
      CategorySeniorityLevel,
      SourceCategoryMapping,
      SeniorityLevel,
      JobSearchIntent,
      JobCrawlRun,
      JobPost,
      JobPostSeniorityLevel,
      JobIntentMatch,
    ]),
    ResearchRealtimeModule,
    AiModule,
    BullModule.registerQueue({
      name: JOB_RESEARCH_QUEUE,
    }),
    BullModule.registerQueue({
      name: CATEGORY_CRAWL_QUEUE,
    }),
    BullBoardModule.forFeature({
      name: JOB_RESEARCH_QUEUE,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: CATEGORY_CRAWL_QUEUE,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [CrawlerController],
  providers: [
    CrawlerHttpService,
    JobResearchService,
    JobResearchProcessor,
    CategoryCrawlService,
    CategoryCrawlProcessor,
    CrawlNotifyService,
  ],
  exports: [JobResearchService],
})
export class CrawlerModule {}
