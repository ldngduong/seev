import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { SavedJobsQueryDto } from './dto/saved-jobs-query.dto';
import { SavedJobsService } from './saved-jobs.service';

@Controller('saved-jobs')
@UseGuards(JwtAuthGuard)
export class SavedJobsController {
  constructor(private readonly service: SavedJobsService) {}

  @Post('jobs/:jobId')
  save(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.save(req.user.id, jobId);
  }

  @Delete('jobs/:jobId')
  unsave(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.unsave(req.user.id, jobId);
  }

  @Get()
  list(@Query() query: SavedJobsQueryDto, @Req() req: AuthenticatedRequest) {
    return this.service.list(req.user.id, query);
  }
}