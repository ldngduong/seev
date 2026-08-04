import { normalizeText, uniqueNonEmpty } from './text-normalizer';

describe('crawler text normalizer', () => {
  it('normalizes nested crawler values without assuming every field is a string', () => {
    expect(
      normalizeText({
        title: 'Frontend',
        tags: ['React', { name: 'TypeScript' }, 12],
      }),
    ).toBe('Frontend React TypeScript 12');
  });

  it('deduplicates arrays and accepts a single non-array value', () => {
    expect(
      uniqueNonEmpty(['React', 'react', null, { name: 'Node.js' }]),
    ).toEqual(['React', 'Node.js']);
    expect(uniqueNonEmpty({ cityName: 'Ha Noi' })).toEqual(['Ha Noi']);
  });
});
