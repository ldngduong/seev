import { BadRequestException, Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

import type {
  CandidateHighlight,
  ParsedResume,
  ResumeTextLine,
} from './interfaces/parsed-resume.interface';

const MAX_AI_TEXT_LENGTH = 18_000;
const PDF_TEXT_OPTIONS = {
  lineEnforce: true,
  lineThreshold: 4.5,
  cellSeparator: '\n',
  cellThreshold: 7,
  pageJoiner: '\n',
};

@Injectable()
export class PdfParserService {
  async parse(file: Express.Multer.File): Promise<ParsedResume> {
    const parser = new PDFParse({ data: file.buffer });

    try {
      const result = await parser.getText(PDF_TEXT_OPTIONS);
      const lines = result.pages.flatMap((page) =>
        this.toTextLines(page.text, page.num),
      );
      const text = this.normalizeDocumentText(result.text).slice(
        0,
        MAX_AI_TEXT_LENGTH,
      );

      if (!text) {
        throw new BadRequestException(
          'The PDF does not contain extractable text.',
        );
      }

      return {
        text,
        totalPages: result.total,
        lines,
      };
    } finally {
      await parser.destroy();
    }
  }

  buildCandidateHighlights(lines: ResumeTextLine[]): CandidateHighlight[] {
    const highlights: CandidateHighlight[] = [];

    for (const line of this.toLogicalLines(lines)) {
      if (line.text.length < 12) {
        continue;
      }

      highlights.push({
        id: `hl_${String(highlights.length + 1).padStart(3, '0')}`,
        pageNumber: line.pageNumber,
        text: line.text,
      });

      if (highlights.length >= 120) {
        break;
      }
    }

    return highlights;
  }

  private toLogicalLines(lines: ResumeTextLine[]) {
    const logicalLines: ResumeTextLine[] = [];

    for (const line of lines) {
      const previous = logicalLines.at(-1);

      if (previous && this.shouldMergeContinuation(previous, line)) {
        previous.text = `${previous.text} ${line.text}`;
        continue;
      }

      logicalLines.push({ ...line });
    }

    return logicalLines;
  }

  private shouldMergeContinuation(
    previous: ResumeTextLine,
    current: ResumeTextLine,
  ) {
    if (previous.pageNumber !== current.pageNumber) {
      return false;
    }

    const previousText = previous.text.trim();
    const currentText = current.text.trim();

    if (!previousText || !currentText) {
      return false;
    }

    if (
      this.looksLikeStandaloneLink(previousText) ||
      this.looksLikeStandaloneLink(currentText)
    ) {
      return false;
    }

    if (
      this.looksLikeStandaloneBlock(previousText) ||
      this.looksLikeStandaloneBlock(currentText)
    ) {
      return false;
    }

    if (this.looksLikeNewBlock(currentText)) {
      return false;
    }

    if (this.looksLikeStandaloneHeading(previousText)) {
      return false;
    }

    const previousEndsSentence = /[.!?;:]$/.test(previousText);
    const currentContinuesSentence = /^[a-z(,]/.test(currentText);
    const previousEndsOpenPhrase =
      /(?:\b(?:and|or|to|of|for|with|via|using|in|on|at|by|from|into|including|integrated|designed|developed|built|handled)\b|[,/([{])$/i.test(
        previousText,
      );

    return (
      !previousEndsSentence &&
      (currentContinuesSentence || previousEndsOpenPhrase)
    );
  }

  private looksLikeNewBlock(text: string) {
    if (/^[-•*]\s+/.test(text)) {
      return false;
    }

    if (this.looksLikeStandaloneBlock(text)) {
      return true;
    }

    if (/^[A-Z][A-Za-z /&+().-]{1,48}:\s*$/.test(text)) {
      return true;
    }

    if (/^[A-Z][A-Za-z /&+-]{1,36}:\s+\S/.test(text)) {
      return true;
    }

    if (/^\d+[.)]\s+\S/.test(text)) {
      return true;
    }

    const letters = text.replace(/[^A-Za-z]/g, '');
    const words = text.split(/\s+/);

    return (
      letters.length >= 4 &&
      words.length <= 4 &&
      letters === letters.toUpperCase()
    );
  }

  private looksLikeStandaloneHeading(text: string) {
    if (this.looksLikeStandaloneBlock(text)) {
      return true;
    }

    const letters = text.replace(/[^A-Za-z]/g, '');
    const words = text.split(/\s+/);

    return (
      letters.length >= 4 &&
      words.length <= 5 &&
      letters === letters.toUpperCase()
    );
  }

  private looksLikeStandaloneBlock(text: string) {
    const trimmed = text.trim();

    if (!trimmed) {
      return false;
    }

    const letters = trimmed.replace(/[^A-Za-z]/g, '');

    if (letters.length < 4 || letters !== letters.toUpperCase()) {
      return false;
    }

    const tokens = trimmed.split(/\s+/);
    const alphaTokens = tokens.filter((token) => /^[A-Z]+$/.test(token));
    const singleLetterTokens = alphaTokens.filter(
      (token) => token.length === 1,
    );

    if (
      alphaTokens.length >= 4 &&
      singleLetterTokens.length / alphaTokens.length >= 0.8
    ) {
      return true;
    }

    return /^[A-Z0-9][A-Z0-9 /&+().,-]{2,64}$/.test(trimmed);
  }

  private looksLikeStandaloneLink(text: string) {
    return /^(?:https?:\/\/)?(?:[\w-]+\.)+[a-z]{2,}(?:\/\S*)?$/i.test(text);
  }

  private toTextLines(pageText: string, pageNumber: number): ResumeTextLine[] {
    return pageText
      .split(/[\n\t]+/)
      .map((line) => this.normalizeText(line))
      .filter(Boolean)
      .map((text) => ({ pageNumber, text }));
  }

  private normalizeText(text: string) {
    return this.repairPdfLetterSpacing(text).replace(/\s+/g, ' ').trim();
  }

  private normalizeDocumentText(text: string) {
    return this.repairPdfLetterSpacing(text)
      .split('\n')
      .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  private repairPdfLetterSpacing(text: string) {
    return text
      .split('\n')
      .map((line) => this.repairPdfLetterSpacingLine(line))
      .join('\n');
  }

  private repairPdfLetterSpacingLine(line: string) {
    let repaired = line;

    repaired = repaired.replace(/\b(?:[A-Z]\s+){1,}[A-Z]\b/g, (match) => {
      const letters = match.replace(/\s+/g, '');

      if (letters.length <= 4) {
        return letters;
      }

      return match;
    });

    repaired = repaired.replace(
      /(?:[A-Za-z0-9._%+-]\s*)+@\s*(?:[A-Za-z0-9-]\s*)+(?:\.\s*(?:[A-Za-z]\s*){2,})+/g,
      (match) => match.replace(/\s+/g, ''),
    );

    repaired = repaired.replace(
      /\b(?:[A-Za-z0-9-]\s*){2,}\.\s*(?:[A-Za-z]\s*){2,}\b/g,
      (match) => match.replace(/\s+/g, ''),
    );

    repaired = repaired.replace(/(?:\+?\d\s*){7,}/g, (match) =>
      match.replace(/\s+/g, ''),
    );

    return repaired;
  }
}
