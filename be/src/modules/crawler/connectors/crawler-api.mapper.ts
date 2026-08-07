import { z } from 'zod';

import type { CrawledJob } from '../types/crawled-job.type';

/**
 * V1 wire contract produced by the Python crawler service.
 * Mirrors `CrawledJobV1` in `crawl/src/models.py` — keep both in sync.
 */
export const crawlerJobSchema = z
  .object({
    contract_version: z.literal(1).optional(),
    source: z.string().min(1),
    source_job_id: z.string().min(1),
    title: z.string().min(1),
    company_name: z.string().nullable().optional(),
    source_url: z.string().min(1),
    salary_text: z.string().nullable().optional(),
    salary_min: z.number().int().nullable().optional(),
    salary_max: z.number().int().nullable().optional(),
    salary_currency: z.string().nullable().optional(),
    locations: z.array(z.string()).default([]),
    seniority_text: z.string().nullable().optional(),
    experience_min: z.number().nullable().optional(),
    experience_max: z.number().nullable().optional(),
    job_type: z.string().nullable().optional(),
    level: z.string().nullable().optional(),
    experience: z.string().nullable().optional(),
    skills: z.array(z.string()).default([]),
    posted_at: z.string().nullable().optional(),
    expired_at: z.string().nullable().optional(),
    logo: z.string().nullable().optional(),
    raw: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export type CrawlerJobV1 = z.infer<typeof crawlerJobSchema>;

export const crawlerSourceStatusSchema = z.object({
  source: z.string(),
  status: z.string(),
  count: z.number().optional(),
  error: z.string().nullable().optional(),
  elapsed_ms: z.number().optional(),
});

export const crawlerSearchResponseSchema = z
  .object({
    results: z.array(crawlerJobSchema).default([]),
    per_source: z.record(z.string(), crawlerSourceStatusSchema).default({}),
    total: z.number().optional(),
    elapsed_ms: z.number().optional(),
    saved: z.number().optional(),
  })
  .strict()
  .passthrough();

export type CrawlerSearchResponse = z.infer<typeof crawlerSearchResponseSchema>;

export function parseCrawlerSearchResponse(
  payload: unknown,
): CrawlerSearchResponse {
  return crawlerSearchResponseSchema.parse(payload);
}

export function mapCrawledJobV1(job: CrawlerJobV1): CrawledJob {
  return {
    source: job.source as CrawledJob['source'],
    sourceJobId: job.source_job_id,
    sourceUrl: job.source_url,
    title: job.title,
    companyName: job.company_name ?? null,
    salaryText: job.salary_text ?? null,
    salaryMin: job.salary_min ?? null,
    salaryMax: job.salary_max ?? null,
    salaryCurrency: job.salary_currency ?? null,
    locations: job.locations,
    seniorityText: job.seniority_text ?? null,
    experienceMin: job.experience_min ?? null,
    experienceMax: job.experience_max ?? null,
    jobType: job.job_type ?? null,
    level: job.level ?? null,
    experience: job.experience ?? null,
    skills: job.skills,
    postedAt: toDate(job.posted_at),
    expiredAt: toDate(job.expired_at),
    logo: job.logo ?? null,
    raw: job.raw,
  };
}

function toDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}
