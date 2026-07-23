import { resolveJobSearchQueries } from './job-search-query';

describe('resolveJobSearchQueries', () => {
  it('keeps concise role queries ahead of broad category and keyword queries', () => {
    const queries = resolveJobSearchQueries({
      targetRole: 'Intern Frontend Developer',
      seniorityLevelName: 'Intern',
      jobCategoryName: 'Web Development',
      searchQueries: [
        'Intern Frontend Developer',
        'Frontend Developer Intern',
        'Frontend Developer',
        'React Developer',
      ],
      keywords: [
        'ReactJS',
        'Next.js',
        'TypeScript',
        'NestJS',
        'Prisma',
        'Docker',
        'Web Development',
      ],
    });

    expect(queries).toContain('Frontend Developer');
    expect(queries).not.toContain('Intern Frontend Developer');
    expect(queries).not.toContain('Frontend Developer Intern');
    expect(queries.indexOf('Frontend Developer')).toBeLessThan(
      queries.indexOf('Web Development'),
    );
  });
});
