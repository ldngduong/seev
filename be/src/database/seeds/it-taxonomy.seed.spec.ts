import { sourceCategoryPages } from './it-taxonomy.seed';

describe('IT taxonomy source mappings', () => {
  const itviec = sourceCategoryPages.filter((row) => row[1] === 'itviec');
  const topcv = sourceCategoryPages.filter((row) => row[1] === 'topcv');

  it('keeps every ITViec mapping on a unique native expertise URL', () => {
    expect(itviec).toHaveLength(24);
    expect(new Set(itviec.map((row) => row[4])).size).toBe(24);
    for (const [, , externalKey, , crawlUrl] of itviec) {
      expect(crawlUrl).toBe(`https://itviec.com/it-jobs/${externalKey}`);
    }
  });

  it.each([
    [1204, 'ai-machine-learning-engineer', 'AI / Machine Learning Engineer'],
    [
      1302,
      'systems-engineer-administrator',
      'Systems Engineer / Administrator',
    ],
    [1701, 'product-designer', 'Product Designer'],
  ])(
    'uses the verified ITViec expertise for category %i',
    (ordinal, key, label) => {
      expect(itviec.find((row) => row[0] === ordinal)?.slice(2, 4)).toEqual([
        key,
        label,
      ]);
    },
  );

  it('uses TopCV current native label for Product Management', () => {
    expect(topcv.find((row) => row[0] === 1602)?.slice(2, 4)).toEqual([
      '321',
      'Product Owner/Product Manager',
    ]);
  });
});
