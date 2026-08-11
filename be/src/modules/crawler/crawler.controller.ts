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
import { CategoryCrawlService } from './category-crawl.service';
import { CreateJobResearchIntentDto } from './dto/create-job-research-intent.dto';
import { JobResearchQueryDto } from './dto/job-research-query.dto';
import { RunCategoryCrawlDto } from './dto/run-category-crawl.dto';
import { JobResearchService } from './job-research.service';

@Controller('job-research')
export class CrawlerController {
  constructor(
    private readonly jobResearchService: JobResearchService,
    private readonly categoryCrawlService: CategoryCrawlService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('intents')
  async createIntent(
    @Body() dto: CreateJobResearchIntentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.jobResearchService.createIntent(dto, req.user.id);

    return {
      intent: result.intent,
      queue_job_id: result.queueJobId,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('intents')
  listIntents(
    @Req() req: AuthenticatedRequest,
    @Query() query: JobResearchQueryDto,
  ) {
    return this.jobResearchService.listUserIntents(req.user.id, query.limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('intents/:id')
  getIntent(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.jobResearchService.getIntent(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('intents/:id/jobs')
  getIntentJobs(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Query() query: JobResearchQueryDto,
  ) {
    return this.jobResearchService.getIntentJobs(id, req.user.id, query.limit);
  }

  @Post('category-crawl/run')
  async runCategoryCrawl(@Body() dto: RunCategoryCrawlDto) {
    return this.categoryCrawlService.trigger(dto?.forceRetry ?? false);
  }
}
