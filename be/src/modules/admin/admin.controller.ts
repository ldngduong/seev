import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';

import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { CategoryCrawlService } from '../crawler/category-crawl.service';
import { RunCategoryCrawlDto } from '../crawler/dto/run-category-crawl.dto';
import { AdminService } from './admin.service';
import { AdjustCreditsDto, UpdateServicePriceDto } from './dto/admin.dto';
import { ExternalQuotaService } from './external-quota.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService, private readonly crawls: CategoryCrawlService, private readonly quotas: ExternalQuotaService) {}
  @Get('dashboard') dashboard() { return this.admin.dashboard(); }
  @Get('users') users(@Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('search') search?: string) { return this.admin.listUsers(Number(page) || 1, Math.min(Number(pageSize) || 20, 100), search); }
  @Get('users/:id') user(@Param('id') id: string) { return this.admin.getUser(id); }
  @Post('users/:id/credits') adjust(@Param('id') id: string, @Body() dto: AdjustCreditsDto, @Req() request: AuthenticatedRequest) { return this.admin.adjustCredits(id, request.user.id, dto.amount, dto.reason, dto.idempotencyKey); }
  @Get('services') services() { return this.admin.catalog(); }
  @Patch('services/:id') price(@Param('id') id: string, @Body() dto: UpdateServicePriceDto, @Req() request: AuthenticatedRequest) { return this.admin.updatePrice(id, dto.priceCredits, request.user.id); }
  @Get('external-quotas') quotasStatus() { return this.quotas.getAll(); }
  @Get('crawls') crawlRuns(@Query('page') page?: string, @Query('pageSize') pageSize?: string) { return this.crawls.listRuns(Number(page) || 1, Math.min(Number(pageSize) || 20, 100)); }
  @Get('crawls/queue') crawlQueue() { return this.crawls.getQueueOverview(); }
  @Get('crawls/:id') crawl(@Param('id') id: string) { return this.crawls.getRun(id); }
  @Post('crawls/run') run(@Body() dto: RunCategoryCrawlDto, @Req() request: AuthenticatedRequest) { return this.crawls.trigger(dto.forceRetry, request.user.id); }
  @Post('crawls/:id/cancel') cancelCrawl(@Param('id') id: string) { return this.crawls.cancel(id); }
  @Delete('crawls/queue/:jobId') remove(@Param('jobId') jobId: string) { return this.crawls.removeQueueJob(jobId); }
}
