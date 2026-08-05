import { buildJobMatchProfile, scoreJobMatch } from './job-match';

describe('job occupation matching', () => {
  const profile = buildJobMatchProfile({
    targetRole: 'Business Analyst',
    jobCategoryName: 'IT / Business Analysis',
    seniorityLevelName: 'Intern',
    keywords: ['BRD', 'SRS', 'Use Case', 'SQL', 'AI'],
    searchQueries: [
      'Business Analyst Intern',
      'IT Business Analyst',
      'Thực tập sinh phân tích nghiệp vụ',
    ],
  });

  it('accepts the requested occupation before applying seniority', () => {
    const result = scoreJobMatch(profile, {
      title: 'Thực Tập Sinh Phân Tích Nghiệp Vụ',
      searchText:
        'Thực Tập Sinh Phân Tích Nghiệp Vụ BRD SRS Use Case SQL intern',
      seniorityText: 'Thực tập sinh',
      description: 'Phân tích yêu cầu nghiệp vụ và viết BRD.',
      requirements: null,
      benefits: null,
    });

    expect(result.accepted).toBe(true);
    expect(result.terms).toContain('seniority:intern');
  });

  it('rejects another occupation even when skills and seniority overlap', () => {
    const result = scoreJobMatch(profile, {
      title: 'Accounting Intern - Thực Tập Sinh Kế Toán',
      searchText: 'Accounting Intern business data AI SQL',
      seniorityText: 'Intern',
      description: 'Use data and SQL to support accounting reports.',
      requirements: null,
      benefits: null,
    });

    expect(result).toEqual({ score: 0, terms: [], accepted: false });
  });

  it('does not accept a different title that merely mentions the occupation in its body', () => {
    const result = scoreJobMatch(profile, {
      title: 'Product Executive Intern',
      searchText:
        'Product Executive Intern. Collaborate with the Business Analyst team using BRD and SQL.',
      seniorityText: 'Intern',
      description: 'Coordinate requirements with business analysts.',
      requirements: null,
      benefits: null,
    });

    expect(result).toEqual({ score: 0, terms: [], accepted: false });
  });

  it('rejects a conflicting explicit seniority after occupation matching', () => {
    const result = scoreJobMatch(profile, {
      title: 'Senior Business Analyst',
      searchText: 'Senior Business Analyst BRD SRS',
      seniorityText: 'Senior',
      description: null,
      requirements: 'Five years of experience.',
      benefits: null,
    });

    expect(result.accepted).toBe(false);
  });
});
