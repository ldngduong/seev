import { Controller, Get, ParseUUIDPipe, Query } from '@nestjs/common';

import { SeniorityService } from './seniority.service';

@Controller('seniority-levels')
export class SeniorityController {
  constructor(private readonly seniorityService: SeniorityService) {}

  @Get()
  findActive(
    @Query('categoryId', new ParseUUIDPipe({ optional: true }))
    categoryId?: string,
  ) {
    return this.seniorityService.findActive(categoryId);
  }
}
