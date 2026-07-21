import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiModule } from '../ai/ai.module';
import { JobFamilyCategory } from '../job-category/entities/job-family-category.entity';
import { SeniorityLevel } from '../seniority/entities/seniority-level.entity';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { CvAuditBatch } from './entities/cv-audit-batch.entity';
import { CvAudit } from './entities/cv-audit.entity';
import { PdfParserService } from './pdf-parser.service';

@Module({
  imports: [
    AiModule,
    TypeOrmModule.forFeature([
      CvAudit,
      CvAuditBatch,
      JobFamilyCategory,
      SeniorityLevel,
    ]),
  ],
  controllers: [CvController],
  providers: [CvService, PdfParserService],
})
export class CvModule {}
