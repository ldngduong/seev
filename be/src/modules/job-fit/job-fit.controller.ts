import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { CreateJobFitDto } from './dto/create-job-fit.dto';
import { JobFitListQueryDto } from './dto/job-fit-list-query.dto';
import { JobFitService } from './job-fit.service';

@Controller('job-fit')
@UseGuards(JwtAuthGuard)
export class JobFitController {
  constructor(private readonly service: JobFitService) {}
  @Post('jobs/:jobId') create(@Param('jobId') jobId: string, @Body() dto: CreateJobFitDto, @Req() req: AuthenticatedRequest) { return this.service.create(req.user.id, jobId, dto.userCvId); }
  @Post(':id/retry') retry(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.service.retry(req.user.id, id); }
  @Get() list(@Query() query: JobFitListQueryDto, @Req() req: AuthenticatedRequest) { return this.service.list(req.user.id, query); }
  @Get(':id') get(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.service.get(req.user.id, id); }
}
