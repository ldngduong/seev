import {
  mapCrawledJobV1,
  parseCrawlerSearchResponse,
  type CrawlerJobV1,
} from './crawler-api.mapper';

describe('crawler-api.mapper', () => {
  const v1Job: CrawlerJobV1 = {
    contract_version: 2,
    source: 'topcv',
    source_job_id: '42',
    title: 'Backend Developer',
    company_name: 'ACME',
    source_url: 'https://www.topcv.vn/backend-42.html',
    salary_text: '1,000 - 2,000 USD',
    salary_min: 1000,
    salary_max: 2000,
    salary_currency: 'USD',
    locations: ['Ho Chi Minh'],
    source_seniority_key: '1',
    source_seniority_text: 'Nhân viên',
    seniority_matches: [
      {
        code: 'senior',
        mapping_method: 'title_explicit',
        confidence: 0.99,
        evidence: { title: 'Backend Developer' },
        is_primary: true,
      },
    ],
    experience_min: 4,
    experience_max: 5,
    job_type: 'full_time',
    experience: '5 years',
    skills: ['python', 'django'],
    posted_at: '2026-08-01T00:00:00+00:00',
    expired_at: '2026-09-01T00:00:00+00:00',
    logo: 'https://ex/logo.png',
    raw: { source_payload: 'debug' },
  };

  it('maps every contract field to CrawledJob', () => {
    const job = mapCrawledJobV1(v1Job);

    expect(job.source).toBe('topcv');
    expect(job.sourceJobId).toBe('42');
    expect(job.title).toBe('Backend Developer');
    expect(job.companyName).toBe('ACME');
    expect(job.sourceUrl).toBe('https://www.topcv.vn/backend-42.html');
    expect(job.salaryText).toBe('1,000 - 2,000 USD');
    expect(job.salaryMin).toBe(1000);
    expect(job.salaryMax).toBe(2000);
    expect(job.salaryCurrency).toBe('USD');
    expect(job.locations).toEqual(['Ho Chi Minh']);
    expect(job.sourceSeniorityText).toBe('Nhân viên');
    expect(job.seniorityMatches[0].code).toBe('senior');
    expect(job.experienceMin).toBe(4);
    expect(job.experienceMax).toBe(5);
    expect(job.jobType).toBe('full_time');
    expect(job.experience).toBe('5 years');
    expect(job.skills).toEqual(['python', 'django']);
    expect(job.postedAt).toEqual(new Date('2026-08-01T00:00:00+00:00'));
    expect(job.expiredAt).toEqual(new Date('2026-09-01T00:00:00+00:00'));
    expect(job.logo).toBe('https://ex/logo.png');
    expect(job.raw).toEqual({ source_payload: 'debug' });
  });

  it('defaults missing optional fields to null/[]', () => {
    const job = mapCrawledJobV1({
      contract_version: 2,
      source: 'topcv',
      source_job_id: '7',
      title: 'Frontend',
      source_url: 'https://topdev.vn/7',
      locations: [],
      skills: [],
      raw: {},
      seniority_matches: [
        {
          code: 'junior',
          mapping_method: 'title_explicit',
          confidence: 0.99,
          evidence: {},
          is_primary: true,
        },
      ],
      posted_at: 'not-a-date',
    });

    expect(job.companyName).toBeNull();
    expect(job.salaryText).toBeNull();
    expect(job.salaryMin).toBeNull();
    expect(job.salaryMax).toBeNull();
    expect(job.salaryCurrency).toBeNull();
    expect(job.locations).toEqual([]);
    expect(job.skills).toEqual([]);
    expect(job.postedAt).toBeNull();
  });

  it('parses a full search response', () => {
    const parsed = parseCrawlerSearchResponse({
      results: [v1Job],
      per_source: {
        topcv: { source: 'topcv', status: 'ok', count: 1, elapsed_ms: 5 },
      },
      total: 1,
      elapsed_ms: 5,
    });

    expect(parsed.results).toHaveLength(1);
    expect(parsed.per_source.topcv.status).toBe('ok');
  });

  it('rejects unknown fields (contract drift fails loudly)', () => {
    expect(() =>
      parseCrawlerSearchResponse({ results: [{ ...v1Job, bogus: 1 }] }),
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() =>
      parseCrawlerSearchResponse({
        results: [{ ...v1Job, title: undefined }],
      }),
    ).toThrow();
  });

  it('accepts a source error status', () => {
    const parsed = parseCrawlerSearchResponse({
      results: [],
      per_source: {
        topcv: {
          source: 'topcv',
          status: 'error',
          count: 0,
          error: 'cloudflare blocked',
          elapsed_ms: 12,
        },
      },
    });

    expect(parsed.per_source.topcv.status).toBe('error');
    expect(parsed.per_source.topcv.error).toBe('cloudflare blocked');
  });
});
