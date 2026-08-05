import { resolveJobSearchQueries } from './job-search-query';

describe('resolveJobSearchQueries', () => {
  it('uses occupation aliases without turning skills or categories into queries', () => {
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
    expect(queries).toContain('React Developer');
    expect(queries).not.toContain('Web Development');
    expect(queries).not.toContain('ReactJS');
    expect(queries).not.toContain('NestJS');
  });
});
