import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { CreateJdResearchDto, CreateLinkResearchDto, ExternalJobResearchListQueryDto } from './dto/external-job-research.dto';
import { ExternalJobDocumentService } from './external-job-document.service';
import { ExternalJobResearchService } from './external-job-research.service';

const MAX_FILE_SIZE = 8 * 1024 * 1024;

@Controller('external-job-research')
@UseGuards(JwtAuthGuard)
export class ExternalJobResearchController {
  constructor(private readonly service: ExternalJobResearchService, private readonly documents: ExternalJobDocumentService) {}

  @Post('jd')
  @UseInterceptors(FileInterceptor('document', { storage: memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } }))
  async createJd(@UploadedFile() file: Express.Multer.File | undefined, @Body() dto: CreateJdResearchDto, @Req() req: AuthenticatedRequest) {
    if (Boolean(file) === Boolean(dto.text?.trim())) throw new BadRequestException('Hãy dán nội dung JD hoặc tải lên một tệp.');
    if (file) {
      const extracted = await this.documents.extract(file);
      return this.service.create(req.user.id, { userCvId: dto.userCvId, sourceKind: 'jd', inputKind: extracted.inputKind, content: extracted.text });
    }
    return this.service.create(req.user.id, { userCvId: dto.userCvId, sourceKind: 'jd', inputKind: 'text', content: dto.text! });
  }

  @Post('link')
  createLink(@Body() dto: CreateLinkResearchDto, @Req() req: AuthenticatedRequest) {
    return this.service.createFromLink(req.user.id, dto.userCvId, dto.url);
  }

  @Post(':id/retry') retry(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.service.retry(req.user.id, id); }
  @Get() list(@Query() query: ExternalJobResearchListQueryDto, @Req() req: AuthenticatedRequest) { return this.service.list(req.user.id, query); }
  @Get(':id') get(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.service.get(req.user.id, id); }
}
