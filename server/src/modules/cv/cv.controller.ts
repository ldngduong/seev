import {
  BadRequestException,
  Body,
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { CreateCvAuditDto } from './dto/create-cv-audit.dto';
import { CvService } from './cv.service';

const PDF_MAX_SIZE_BYTES = 5 * 1024 * 1024;

@Controller('cv')
export class CvController {
  constructor(private readonly cvService: CvService) {}

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
  ) {
    if (!file || file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are supported.');
    }

    return this.cvService.createAudit(file, dto);
  }
}
