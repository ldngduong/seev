import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CategorySeniorityLevel } from '../job-category/entities/category-seniority-level.entity';
import { SeniorityLevel } from './entities/seniority-level.entity';
import { SeniorityController } from './seniority.controller';
import { SeniorityService } from './seniority.service';

@Module({
  imports: [TypeOrmModule.forFeature([SeniorityLevel, CategorySeniorityLevel])],
  controllers: [SeniorityController],
  providers: [SeniorityService],
  exports: [SeniorityService],
})
export class SeniorityModule {}
