import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../../config/env.schema';
import { CrawlerHttpService } from '../crawler-http.service';
import type {
  CrawledJob,
  JobSearchIntentPayload,
  JobSourceConnector,
} from '../types/crawled-job.type';
import { resolveJobSearchQueries } from '../utils/job-search-query';
import { runWithConcurrency } from '../../../shared/utils/run-with-concurrency';
import { resolveVietnamWorksLevelFilter } from '../utils/source-seniority-filters';
import { normalizeText, uniqueNonEmpty } from '../utils/text-normalizer';

interface VietnamWorksSearchResponse {
  meta?: {
    code?: number;
    nbHits?: number;
    page?: number;
    nbPages?: number;
    hitsPerPage?: number;
  };
  data?: VietnamWorksJob[];
}

interface VietnamWorksJob {
  jobId?: number | string;
  jobTitle?: string;
  jobUrl?: string;
  alias?: string;
  companyName?: string;
  isAnonymous?: boolean;
  salary?: string;
  prettySalary?: string;
  jobLevel?: string;
  jobLevelVI?: string;
  jobDescription?: string;
  jobRequirement?: string;
  benefits?: string[];
  skills?: Array<string | { skillName?: string; name?: string }>;
  approvedOn?: string;
  expiredOn?: string;
  workingLocations?: Array<{
    cityName?: string;
    cityNameVI?: string;
    address?: string;
  }>;
}

@Injectable()
export class VietnamWorksConnector implements JobSourceConnector {
  readonly source = 'vietnamworks' as const;

  constructor(
    private readonly http: CrawlerHttpService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async search(intent: JobSearchIntentPayload): Promise<CrawledJob[]> {
    if (!this.config.get('VIETNAMWORKS_ENABLED', { infer: true })) {
      return [];
    }

    const jobs: CrawledJob[] = [];
    const seen = new Set<string>();
    const hitsPerPage = Math.min(intent.maxJobsPerSource, 50);
    const queries = resolveJobSearchQueries(intent);
    const queryResults = await runWithConcurrency(
      queries,
      this.config.get('JOB_RESEARCH_QUERY_CONCURRENCY', { infer: true }),
      async (query) => {
        try {
          const response =
            await this.http.fetchJson<VietnamWorksSearchResponse>(
              this.config.get('VIETNAMWORKS_SEARCH_URL', { infer: true }),
              this.buildSearchRequest(query, hitsPerPage, intent),
            );
          return {
            jobs: (Array.isArray(response.data) ? response.data : []).map(
              (job) => this.mapJob(job, query),
            ),
            query,
            error: null,
          };
        } catch (error) {
          return {
            jobs: [] as CrawledJob[],
            query,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    );

    for (const result of queryResults) {
      for (const job of result.jobs) {
        const key = `${job.source}:${job.sourceJobId}`;

        if (!job.sourceJobId || seen.has(key)) {
          continue;
        }

        seen.add(key);
        jobs.push(job);

        if (jobs.length >= intent.maxJobsPerSource) {
          return jobs;
        }
      }
    }

    const errors = queryResults.filter((result) => result.error);

    if (queries.length > 0 && errors.length === queries.length) {
      throw new Error(
        `VietnamWorks failed for every query: ${errors
          .map((result) => `${result.query}: ${result.error}`)
          .join(' | ')}`,
      );
    }

    return jobs;
  }

  private buildSearchRequest(
    query: string,
    hitsPerPage: number,
    intent: JobSearchIntentPayload,
  ) {
    const jobLevelId = resolveVietnamWorksLevelFilter(intent);

    return {
      method: 'POST' as const,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        origin: this.config.get('VIETNAMWORKS_BASE_URL', { infer: true }),
        referer: `${this.config.get('VIETNAMWORKS_BASE_URL', {
          infer: true,
        })}/tim-viec-lam/tat-ca-viec-lam?keyword=${encodeURIComponent(query)}`,
      },
      body: JSON.stringify({
        query,
        filter: jobLevelId ? [{ field: 'jobLevelId', value: jobLevelId }] : [],
        ranges: [],
        order: [],
        hitsPerPage,
        page: 0,
        retrieveFields: [
          'benefits',
          'jobTitle',
          'salaryMax',
          'isSalaryVisible',
          'jobLevelVI',
          'salaryMin',
          'companyLogo',
          'jobLevel',
          'jobLevelId',
          'jobId',
          'companyId',
          'approvedOn',
          'isAnonymous',
          'alias',
          'expiredOn',
          'industries',
          'workingLocations',
          'companyName',
          'jobDescription',
          'jobRequirement',
          'skills',
          'salary',
          'prettySalary',
        ],
      }),
    };
  }

  private mapJob(job: VietnamWorksJob, query: string): CrawledJob {
    const sourceJobId = String(job.jobId ?? job.alias ?? '');
    const baseUrl = this.config.get('VIETNAMWORKS_BASE_URL', { infer: true });
    const sourceUrl =
      job.jobUrl ||
      (job.alias && job.jobId
        ? `${baseUrl}/${job.alias}-${job.jobId}-jv`
        : baseUrl);

    return {
      source: this.source,
      sourceJobId,
      sourceUrl,
      title: normalizeText(job.jobTitle),
      companyName: job.isAnonymous
        ? "VietnamWorks' Client"
        : normalizeText(job.companyName) || null,
      salaryText: normalizeText(job.prettySalary || job.salary) || null,
      locations: uniqueNonEmpty(
        (Array.isArray(job.workingLocations)
          ? job.workingLocations
          : []
        ).flatMap((location) => [
          location.cityNameVI,
          location.cityName,
          location.address,
        ]),
      ),
      seniorityText: normalizeText(job.jobLevelVI || job.jobLevel) || null,
      description: normalizeText(job.jobDescription) || null,
      requirements: normalizeText(job.jobRequirement) || null,
      benefits: uniqueNonEmpty(job.benefits).join('\n') || null,
      skills: uniqueNonEmpty(
        Array.isArray(job.skills)
          ? job.skills.map((skill) =>
              typeof skill === 'string' ? skill : skill.skillName || skill.name,
            )
          : job.skills,
      ),
      postedAt: this.toDate(job.approvedOn),
      expiredAt: this.toDate(job.expiredOn),
      raw: {
        ...(job as Record<string, unknown>),
        searchQuery: query,
      },
    };
  }

  private toDate(value: string | undefined) {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
