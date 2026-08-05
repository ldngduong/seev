import { Controller, Get } from '@nestjs/common';

import { SeniorityService } from './seniority.service';

@Controller('seniority-levels')
export class SeniorityController {
  constructor(private readonly seniorityService: SeniorityService) {}

  @Get()
  findActive() {
    return this.seniorityService.findActive();
  }
}
