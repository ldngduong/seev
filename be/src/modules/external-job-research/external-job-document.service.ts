import { BadRequestException, Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { PdfParserService } from '../cv/pdf-parser.service';
import type { ExternalJobResearchInput } from './entities/external-job-research.entity';

const execFileAsync = promisify(execFile);

@Injectable()
export class ExternalJobDocumentService {
  constructor(private readonly pdfParser: PdfParserService) {}

  async extract(file: Express.Multer.File): Promise<{ text: string; inputKind: ExternalJobResearchInput }> {
    const extension = file.originalname.toLowerCase().split('.').pop();
    if (file.mimetype === 'application/pdf' || extension === 'pdf') {
      const parsed = await this.pdfParser.parseBuffer(file.buffer);
      return { text: this.normalize(parsed.text), inputKind: 'pdf' };
    }
    if (file.mimetype.startsWith('text/') || extension === 'txt') {
      return { text: this.normalize(file.buffer.toString('utf8')), inputKind: 'txt' };
    }
    if (extension === 'doc' || extension === 'docx') {
      return { text: await this.convertWord(file.buffer, extension), inputKind: 'word' };
    }
    throw new BadRequestException('Chỉ hỗ trợ tệp PDF, Word hoặc TXT.');
  }

  private async convertWord(buffer: Buffer, extension: string) {
    const directory = await mkdtemp(join(tmpdir(), 'seev-jd-'));
    const inputPath = join(directory, `input.${extension}`);
    try {
      await writeFile(inputPath, buffer);
      await execFileAsync('libreoffice', ['--headless', '--convert-to', 'txt:Text', '--outdir', directory, inputPath], { timeout: 30_000, maxBuffer: 1024 * 1024 });
      return this.normalize(await readFile(join(directory, 'input.txt'), 'utf8'));
    } catch {
      throw new BadRequestException('Không đọc được tệp Word. Hãy kiểm tra tệp hoặc lưu lại dưới dạng PDF/TXT.');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  private normalize(value: string) {
    const text = value.replace(/\0/g, '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 50_000);
    if (text.length < 200) throw new BadRequestException('Nội dung tuyển dụng quá ngắn để đánh giá.');
    return text;
  }
}
