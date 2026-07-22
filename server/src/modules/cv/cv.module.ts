import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiModule } from '../ai/ai.module';
import { CrawlerModule } from '../crawler/crawler.module';
import { JobFamilyCategory } from '../job-category/entities/job-family-category.entity';
import { SeniorityLevel } from '../seniority/entities/seniority-level.entity';
import { StorageModule } from '../storage/storage.module';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { CvAuditBatch } from './entities/cv-audit-batch.entity';
import { CvAudit } from './entities/cv-audit.entity';
import { CvResearchSession } from './entities/cv-research-session.entity';
import { UserCv } from './entities/user-cv.entity';
import { PdfParserService } from './pdf-parser.service';

@Module({
  imports: [
    AiModule,
    CrawlerModule,
    StorageModule,
    TypeOrmModule.forFeature([
      CvAudit,
      CvAuditBatch,
      CvResearchSession,
      JobFamilyCategory,
      SeniorityLevel,
      UserCv,
    ]),
  ],
  controllers: [CvController],
  providers: [CvService, PdfParserService],
})
export class CvModule {}
