import { Controller, Get, Query } from '@nestjs/common';

import { JobCategoryService } from './job-category.service';

@Controller('job-categories')
export class JobCategoryController {
  constructor(private readonly jobCategoryService: JobCategoryService) {}

  @Get('tree')
  findTree() {
    return this.jobCategoryService.findTree();
  }

  @Get('search')
  search(@Query('q') query = '') {
    return this.jobCategoryService.search(query);
  }
}
