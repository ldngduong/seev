import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { CreateJobResearchIntentDto } from './dto/create-job-research-intent.dto';
import { JobResearchQueryDto } from './dto/job-research-query.dto';
import { JobResearchService } from './job-research.service';

@Controller('job-research')
@UseGuards(JwtAuthGuard)
export class CrawlerController {
  constructor(private readonly jobResearchService: JobResearchService) {}

  @Post('intents')
  async createIntent(
    @Body() dto: CreateJobResearchIntentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.jobResearchService.createIntent(
      dto,
      req.user.id,
    );

    return {
      intent: result.intent,
      queue_job_id: result.queueJobId,
    };
  }

  @Get('intents')
  listIntents(
    @Req() req: AuthenticatedRequest,
    @Query() query: JobResearchQueryDto,
  ) {
    return this.jobResearchService.listUserIntents(req.user.id, query.limit);
  }

  @Get('intents/:id')
  getIntent(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.jobResearchService.getIntent(id, req.user.id);
  }

  @Get('intents/:id/jobs')
  getIntentJobs(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Query() query: JobResearchQueryDto,
  ) {
    return this.jobResearchService.getIntentJobs(id, req.user.id, query.limit);
  }
}
