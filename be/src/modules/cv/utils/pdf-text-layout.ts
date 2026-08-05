export interface PdfLayoutTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL: boolean;
}

interface LineBuffer {
  text: string;
  baseline: number;
  height: number;
  lastEndX: number;
  pendingSpace: boolean;
}

const MIN_BASELINE_TOLERANCE = 1.5;
const MIN_WORD_GAP = 1.25;
const MIN_COLUMN_GAP = 48;

export function reconstructPdfTextLines(
  items: PdfLayoutTextItem[],
): string[] {
  const lines: string[] = [];
  let line: LineBuffer | null = null;

  const flush = () => {
    if (line) {
      const text = normalizeLine(line.text);
      if (text) {
        lines.push(text);
      }
    }
    line = null;
  };

  for (const item of items) {
    const rawText = sanitizeItemText(item.str);
    const x = item.transform[4] ?? 0;
    const baseline = item.transform[5] ?? 0;
    const height = Math.max(item.height || Math.abs(item.transform[3] ?? 0), 1);

    if (!rawText.trim()) {
      if (line && rawText.length > 0) {
        line.pendingSpace = true;
      }
      if (item.hasEOL) {
        flush();
      }
      continue;
    }

    if (line && startsNewVisualLine(line, x, baseline, height)) {
      flush();
    }

    if (!line) {
      line = {
        text: rawText.trim(),
        baseline,
        height,
        lastEndX: x + item.width,
        pendingSpace: false,
      };
    } else {
      const gap = x - line.lastEndX;
      const averageGlyphWidth = item.width / Math.max(rawText.trim().length, 1);
      const wordGap = Math.max(
        MIN_WORD_GAP,
        Math.min(4, averageGlyphWidth * 0.35),
      );
      const needsSpace =
        line.pendingSpace ||
        /^\s/.test(rawText) ||
        /\s$/.test(line.text) ||
        gap > wordGap;

      line.text += `${needsSpace ? ' ' : ''}${rawText.trim()}`;
      line.baseline = (line.baseline + baseline) / 2;
      line.height = Math.max(line.height, height);
      line.lastEndX = Math.max(line.lastEndX, x + item.width);
      line.pendingSpace = false;
    }

    if (item.hasEOL) {
      flush();
    }
  }

  flush();
  return lines;
}

function startsNewVisualLine(
  line: LineBuffer,
  x: number,
  baseline: number,
  height: number,
) {
  const baselineTolerance = Math.max(
    MIN_BASELINE_TOLERANCE,
    Math.min(line.height, height) * 0.35,
  );
  const baselineChanged = Math.abs(baseline - line.baseline) > baselineTolerance;
  const horizontalReset = x < line.lastEndX - Math.max(line.height, height);
  const columnGap = x - line.lastEndX > Math.max(
    MIN_COLUMN_GAP,
    Math.max(line.height, height) * 5,
  );

  return baselineChanged || horizontalReset || columnGap;
}

function sanitizeItemText(value: string) {
  return value.replace(/[\u0000\u200B-\u200D\uFEFF]/g, '').replace(/\u00a0/g, ' ');
}

function normalizeLine(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}
