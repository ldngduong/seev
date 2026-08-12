import { z } from 'zod';

import type { CrawledJob } from '../types/crawled-job.type';
import {
  sanitizeJobContent,
  sanitizeJobSkills,
} from '../utils/job-content-sanitizer';

/**
 * V1 wire contract produced by the Python crawler service.
 * Mirrors `CrawledJobV1` in `crawl/src/models.py` — keep both in sync.
 */
export const crawlerJobSchema = z
  .object({
    contract_version: z.literal(3),
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
    source_seniority_key: z.string().nullable().optional(),
    source_seniority_text: z.string().nullable().optional(),
    seniority_matches: z
      .array(
        z.object({
          code: z.string().min(1),
          mapping_method: z.string().min(1),
          confidence: z.number().min(0).max(1),
          evidence: z.record(z.string(), z.unknown()).default({}),
          is_primary: z.boolean().default(false),
        }),
      )
      .min(1),
    experience_min: z.number().nullable().optional(),
    experience_max: z.number().nullable().optional(),
    job_type: z.string().nullable().optional(),
    experience: z.string().nullable().optional(),
    skills: z.array(z.string()).default([]),
    posted_at: z.string().nullable().optional(),
    expired_at: z.string().nullable().optional(),
    logo: z.string().nullable().optional(),
    category_id: z.string().uuid().nullable().optional(),
    category_name: z.string().nullable().optional(),
    raw: z.record(z.string(), z.unknown()).default({}),
    description: z.string().nullable().optional(),
    requirements: z.string().nullable().optional(),
    detail_source: z.string().nullable().optional(),
    detail_parser_version: z.number().int().positive().nullable().optional(),
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
    sourceSeniorityKey: job.source_seniority_key ?? null,
    sourceSeniorityText: job.source_seniority_text ?? null,
    seniorityMatches: job.seniority_matches.map((match) => ({
      code: match.code,
      mappingMethod: match.mapping_method,
      confidence: match.confidence,
      evidence: match.evidence,
      isPrimary: match.is_primary,
    })),
    experienceMin: job.experience_min ?? null,
    experienceMax: job.experience_max ?? null,
    jobType: job.job_type ?? null,
    experience: job.experience ?? null,
    skills: sanitizeJobSkills(job.skills),
    postedAt: toDate(job.posted_at),
    expiredAt: toDate(job.expired_at),
    logo: job.logo ?? null,
    categoryId: job.category_id ?? null,
    categoryName: job.category_name ?? null,
    raw: job.raw,
    description: sanitizeJobContent(job.description) || null,
    requirements: sanitizeJobContent(job.requirements) || null,
    detailSource: job.detail_source ?? null,
    detailParserVersion: job.detail_parser_version ?? null,
  };
}

function toDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}
