import { BadRequestException, Injectable } from '@nestjs/common';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

import type {
  CandidateHighlight,
  ParsedResume,
  ResumeTextLine,
} from './interfaces/parsed-resume.interface';
import {
  reconstructPdfTextLines,
  type PdfLayoutTextItem,
} from './utils/pdf-text-layout';

const MAX_AI_TEXT_LENGTH = 18_000;
export const CURRENT_PDF_PARSER_VERSION = 2;

@Injectable()
export class PdfParserService {
  async parse(file: Express.Multer.File): Promise<ParsedResume> {
    return this.parseBuffer(file.buffer);
  }

  async parseBuffer(buffer: Buffer): Promise<ParsedResume> {
    const loadingTask = getDocument({ data: new Uint8Array(buffer) });
    const document = await loadingTask.promise;

    try {
      const lines: ResumeTextLine[] = [];

      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageLines = reconstructPdfTextLines(
          content.items.filter(isTextItem).map(toLayoutTextItem),
        );

        lines.push(
          ...pageLines
            .map((line) => this.normalizeText(line))
            .filter(Boolean)
            .map((text) => ({ pageNumber, text })),
        );
        page.cleanup();
      }

      const text = lines
        .map((line) => line.text)
        .join('\n')
        .slice(0, MAX_AI_TEXT_LENGTH)
        .trim();

      if (!text) {
        throw new BadRequestException(
          'The PDF does not contain extractable text.',
        );
      }

      return {
        text,
        totalPages: document.numPages,
        lines,
      };
    } finally {
      await document.destroy();
      await loadingTask.destroy();
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

  private normalizeText(text: string) {
    return text.replace(/\s+/g, ' ').trim();
  }
}

function isTextItem(item: unknown): item is TextItem {
  return typeof item === 'object' && item !== null && 'str' in item;
}

function toLayoutTextItem(item: TextItem): PdfLayoutTextItem {
  return {
    str: item.str,
    transform: item.transform,
    width: item.width,
    height: item.height,
    hasEOL: item.hasEOL,
  };
}
