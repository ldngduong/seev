import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JobFamilyCategoryEdge } from './entities/job-family-category-edge.entity';
import { JobFamilyCategory } from './entities/job-family-category.entity';
import { JobCategoryController } from './job-category.controller';
import { JobCategoryService } from './job-category.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobFamilyCategory, JobFamilyCategoryEdge]),
  ],
  controllers: [JobCategoryController],
  providers: [JobCategoryService],
  exports: [JobCategoryService],
})
export class JobCategoryModule {}
