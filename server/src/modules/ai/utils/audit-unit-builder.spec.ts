import type { CandidateHighlight } from '../../cv/interfaces/parsed-resume.interface';
import { buildAuditUnits } from './audit-unit-builder';

function line(id: string, text: string, pageNumber = 1): CandidateHighlight {
  return { id, text, pageNumber };
}

describe('buildAuditUnits', () => {
  it('preserves every source line exactly once and in order', () => {
    const lines = Array.from({ length: 17 }, (_, index) =>
      line(`line_${index}`, `Evidence line ${index} ${'x'.repeat(40)}`),
    );

    const units = buildAuditUnits(lines, {
      maxLines: 5,
      targetCharacters: 400,
    });

    expect(units.flat().map(({ id }) => id)).toEqual(lines.map(({ id }) => id));
    expect(new Set(units.flat().map(({ id }) => id)).size).toBe(lines.length);
    expect(units.every((unit) => unit.length <= 5)).toBe(true);
  });

  it('never mixes lines from different PDF pages', () => {
    const units = buildAuditUnits(
      [
        line('p1_1', 'First page evidence', 1),
        line('p1_2', 'More first page evidence', 1),
        line('p2_1', 'Second page evidence', 2),
        line('p2_2', 'More second page evidence', 2),
      ],
      { maxLines: 20, targetCharacters: 2_000 },
    );

    expect(units).toHaveLength(2);
    expect(
      units.map((unit) => [...new Set(unit.map((item) => item.pageNumber))]),
    ).toEqual([[1], [2]]);
  });

  it('uses generic structural boundaries without depending on CV section names', () => {
    const units = buildAuditUnits(
      [
        line('a', 'A'.repeat(260)),
        line('b', 'B'.repeat(260)),
        line('heading', 'SELECTED ACHIEVEMENTS'),
        line('c', 'Delivered a measurable outcome for a client.'),
      ],
      { maxLines: 20, targetCharacters: 1_000 },
    );

    expect(units.map((unit) => unit.map(({ id }) => id))).toEqual([
      ['a', 'b'],
      ['heading', 'c'],
    ]);
  });

  it('allows one long source line without dropping or splitting its anchor', () => {
    const longLine = line('long', 'x'.repeat(2_500));
    const units = buildAuditUnits([longLine], {
      maxLines: 10,
      targetCharacters: 1_000,
    });

    expect(units).toEqual([[longLine]]);
  });
});
