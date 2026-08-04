import {
  reconstructPdfTextLines,
  type PdfLayoutTextItem,
} from './pdf-text-layout';

function item(
  str: string,
  x: number,
  y: number,
  width: number,
  options: Partial<PdfLayoutTextItem> = {},
): PdfLayoutTextItem {
  return {
    str,
    transform: [1, 0, 0, 10, x, y],
    width,
    height: 10,
    hasEOL: false,
    ...options,
  };
}

describe('reconstructPdfTextLines', () => {
  it('preserves a complete text item exactly', () => {
    const text = 'and the creation of fundamental Business Analyst documents. I aim to';

    expect(
      reconstructPdfTextLines([item(text, 236, 594, 329, { hasEOL: true })]),
    ).toEqual([text]);
  });

  it('does not interpret sentence punctuation as a domain or identifier', () => {
    const text = 'and the creation of fundamental Business Analyst documents. I aim to';

    expect(
      reconstructPdfTextLines([item(text, 236, 594, 329, { hasEOL: true })]),
    ).toEqual([text]);
  });

  it('joins touching font fragments without inventing spaces', () => {
    expect(
      reconstructPdfTextLines([
        item('Certificat', 38, 500, 41),
        item('e of achievement', 79, 500, 88, { hasEOL: true }),
      ]),
    ).toEqual(['Certificate of achievement']);
  });

  it('honors explicit whitespace items', () => {
    expect(
      reconstructPdfTextLines([
        item('become', 20, 400, 34),
        item(' ', 54, 400, 3),
        item('more', 57, 400, 25, { hasEOL: true }),
      ]),
    ).toEqual(['become more']);
  });

  it('infers a word boundary from a geometric gap', () => {
    expect(
      reconstructPdfTextLines([
        item('Business', 20, 300, 42),
        item('Analyst', 66, 300, 34, { hasEOL: true }),
      ]),
    ).toEqual(['Business Analyst']);
  });

  it('separates baselines, horizontal resets, and distant columns', () => {
    expect(
      reconstructPdfTextLines([
        item('First line', 200, 300, 50),
        item('Second line', 200, 280, 58),
        item('Left cell', 20, 260, 40),
        item('Right cell', 180, 260, 45, { hasEOL: true }),
      ]),
    ).toEqual(['First line', 'Second line', 'Left cell', 'Right cell']);
  });
});
