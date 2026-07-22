import {
  BadRequestException,
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';

import { JobResearchService } from '../crawler/job-research.service';
import { CreateJobResearchIntentDto } from '../crawler/dto/create-job-research-intent.dto';
import { JobResearchQueryDto } from '../crawler/dto/job-research-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { CreateCvAuditDto } from './dto/create-cv-audit.dto';
import {
  CreateCustomCvResearchDto,
  CreateQuickCvResearchDto,
} from './dto/create-cv-research.dto';
import { UploadUserCvDto } from './dto/upload-user-cv.dto';
import { CvService } from './cv.service';

const PDF_MAX_SIZE_BYTES = 5 * 1024 * 1024;

@Controller('cv')
@UseGuards(JwtAuthGuard)
export class CvController {
  constructor(
    private readonly cvService: CvService,
    private readonly jobResearchService: JobResearchService,
  ) {}

  @Post('my-cvs')
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: memoryStorage(),
      limits: {
        fileSize: PDF_MAX_SIZE_BYTES,
      },
    }),
  )
  uploadUserCv(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: PDF_MAX_SIZE_BYTES }),
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadUserCvDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file || file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are supported.');
    }

    return this.cvService.uploadUserCv(file, dto, req.user.id);
  }

  @Get('my-cvs')
  listUserCvs(@Req() req: AuthenticatedRequest) {
    return this.cvService.listUserCvs(req.user.id);
  }

  @Get('my-cvs/:cvId/read-url')
  createCvReadUrl(
    @Param('cvId') cvId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.cvService.createCvReadUrl(req.user.id, cvId);
  }

  @Get('my-cvs/:cvId/file')
  async getUserCvFile(
    @Param('cvId') cvId: string,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.cvService.getUserCvFile(req.user.id, cvId);

    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Length', String(file.contentLength ?? file.body.length));
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${sanitizeHeaderFileName(file.fileName)}"`,
    );

    return new StreamableFile(file.body);
  }

  @Post('research/quick')
  createQuickResearch(
    @Body() dto: CreateQuickCvResearchDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.cvService.createQuickResearch(dto, req.user.id);
  }

  @Post('research/custom')
  createCustomResearch(
    @Body() dto: CreateCustomCvResearchDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.cvService.createCustomResearch(dto, req.user.id);
  }

  @Get('research-sessions')
  listResearchSessions(
    @Req() req: AuthenticatedRequest,
    @Query() query: JobResearchQueryDto,
  ) {
    return this.cvService.listResearchSessions(req.user.id, query.limit);
  }

  @Get('research-sessions/:sessionId')
  getResearchSession(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.cvService.getResearchSession(req.user.id, sessionId);
  }

  @Post('research-sessions/:sessionId/job-suggestions/retry')
  retryResearchSessionJobs(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.cvService.retryResearchSessionJobs(req.user.id, sessionId);
  }

  @Post('audits')
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: memoryStorage(),
      limits: {
        fileSize: PDF_MAX_SIZE_BYTES,
      },
    }),
  )
  createAudit(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: PDF_MAX_SIZE_BYTES }),
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: CreateCvAuditDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file || file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are supported.');
    }

    return this.cvService.createAudit(file, dto, req.user.id);
  }

  @Get('audits')
  listAudits(
    @Req() req: AuthenticatedRequest,
    @Query() query: JobResearchQueryDto,
  ) {
    return this.cvService.listAudits(req.user.id, query.limit);
  }

  @Post('audits/:auditId/job-research')
  async createJobResearchFromAudit(
    @Param('auditId') auditId: string,
    @Body() dto: CreateJobResearchIntentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.jobResearchService.createIntent(
      {
        ...dto,
        auditId,
      },
      req.user.id,
    );

    return {
      intent: result.intent,
      queue_job_id: result.queueJobId,
    };
  }
}

function sanitizeHeaderFileName(fileName: string) {
  return fileName.replace(/["\\\r\n]/g, '_');
}
