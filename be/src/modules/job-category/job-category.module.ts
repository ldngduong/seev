import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CategorySeniorityLevel } from './entities/category-seniority-level.entity';
import { JobCategoryAlias } from './entities/job-category-alias.entity';
import { JobCategoryGroup } from './entities/job-category-group.entity';
import { JobCategory } from './entities/job-category.entity';
import { JobCategoryController } from './job-category.controller';
import { JobCategoryService } from './job-category.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobCategory,
      JobCategoryGroup,
      JobCategoryAlias,
      CategorySeniorityLevel,
    ]),
  ],
  controllers: [JobCategoryController],
  providers: [JobCategoryService],
  exports: [JobCategoryService],
})
export class JobCategoryModule {}
