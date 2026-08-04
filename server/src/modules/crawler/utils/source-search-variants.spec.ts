import { buildSourceSearchVariants } from './source-search-variants';

describe('buildSourceSearchVariants', () => {
  it('prioritizes native seniority filters and retains an unfiltered recall pass', () => {
    expect(buildSourceSearchVariants(['Business Analyst'], true)).toEqual([
      { query: 'Business Analyst', applySeniorityFilter: true },
      { query: 'Business Analyst', applySeniorityFilter: false },
    ]);
  });
});
