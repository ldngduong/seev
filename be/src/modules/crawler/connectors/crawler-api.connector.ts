import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../../config/env.schema';
import { runWithConcurrency } from '../../../shared/utils/run-with-concurrency';
import { CrawlerHttpService } from '../crawler-http.service';
import type {
  CrawledJob,
  JobSearchIntentPayload,
  JobSourceConnector,
} from '../types/crawled-job.type';
import type { JobSource } from '../types/job-source.type';
import { resolveJobSearchQueries } from '../utils/job-search-query';
import { resolveSeniorityGroup } from '../utils/seniority-intent';
import {
  mapCrawledJobV1,
  parseCrawlerSearchResponse,
  type CrawlerSearchResponse,
} from './crawler-api.mapper';

const PYTHON_LEVEL_BY_SENIORITY_GROUP: Record<string, string> = {
  intern: 'intern',
  junior: 'junior',
  mid: 'middle',
  senior: 'senior',
};

interface VariantResult {
  jobs: CrawledJob[];
  query: string;
  error: string | null;
}

/**
 * In-flight cache shared by every `CrawlerApiConnector` instance so that the
 * per-source orchestration (one connector per source) results in a SINGLE
 * HTTP call to the crawler service's `/api/v1/search`, which crawls all
 * enabled sources in parallel. Each connector only consumes the jobs of its
 * own source from the shared response.
 *
 * Entries are removed as soon as the request settles: the cache only dedupes
 * CONCURRENT calls within one crawl batch. A stale entry must never survive,
 * otherwise a retry of the same query/level/location body would short-circuit
 * to the previous result instead of crawling again.
 */
const inFlightSearches = new Map<string, Promise<CrawlerSearchResponse>>();

/**
 * Crawls all sources by delegating to the Python crawler service
 * instead of running in-process connectors. Keeps the `JobSourceConnector`
 * contract so orchestration (queue, runs, scoring, snapshots) stays intact.
 */
export class CrawlerApiConnector implements JobSourceConnector {
  readonly source: JobSource;

  private readonly logger = new Logger(CrawlerApiConnector.name);

  constructor(
    source: JobSource,
    private readonly http: CrawlerHttpService,
    private readonly config: ConfigService<Env, true>,
  ) {
    this.source = source;
  }

  async search(intent: JobSearchIntentPayload): Promise<CrawledJob[]> {
    const queries = resolveJobSearchQueries(intent);
    const level = this.resolveLevelFilter(intent);

    if (queries.length === 0) {
      return [];
    }

    const queryResults = await runWithConcurrency(
      queries,
      this.config.get('JOB_RESEARCH_QUERY_CONCURRENCY', { infer: true }),
      (query) => this.searchQuery(intent, query, level),
    );

    const jobs = this.collectJobs(queryResults, intent.maxJobsPerSource);
    const errors = queryResults.filter((result) => result.error);

    if (errors.length === queries.length) {
      throw new Error(
        `Nguồn crawler ${this.source} thất bại ở mọi truy vấn: ${errors
          .map((result) => `${result.query}: ${result.error}`)
          .join(' | ')}`,
      );
    }

    return jobs;
  }

  /** Crawl one verified native category page. This path deliberately carries
   * no role keyword, location or seniority filter. */
  async searchFixedCategory(target: {
    categoryIds: string[];
    categoryCandidates: Record<string, string[]>;
    crawlUrl: string;
    expectedSourceLabel: string | null;
    maxJobs: number;
  }): Promise<CrawledJob[]> {
    const baseUrl = this.config
      .get('CRAWLER_API_URL', { infer: true })
      .replace(/\/+$/, '');
    const token = this.config.get('CRAWLER_BEARER_TOKEN', { infer: true });
    const payload = await this.http.fetchJson<unknown>(
      `${baseUrl}/api/v1/sources/${this.source}/search`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: '',
          category_id:
            target.categoryIds.length === 1 ? target.categoryIds[0] : null,
          candidate_category_ids: target.categoryIds,
          category_candidates: target.categoryCandidates,
          crawl_url: target.crawlUrl,
          expected_source_label: target.expectedSourceLabel,
          keywords: [],
          max_results_per_source: target.maxJobs,
          pages: 5,
          persist: false,
        }),
        timeoutMs: this.config.get('CRAWLER_API_TIMEOUT_MS', { infer: true }),
      },
    );
    const parsed = parseCrawlerSearchResponse(payload);
    const status = parsed.per_source[this.source];
    if (status && status.status !== 'ok') {
      throw new Error(status.error ?? `Crawler status '${status.status}'`);
    }
    return parsed.results.map((job) => ({
      ...mapCrawledJobV1(job),
      source: this.source,
    }));
  }

  private searchQuery(
    intent: JobSearchIntentPayload,
    query: string,
    level: string | null,
  ): Promise<VariantResult> {
    return this.searchAllSources(intent, query, level)
      .then((parsed) => {
        const sourceStatus = parsed.per_source[this.source];

        if (sourceStatus && sourceStatus.status !== 'ok') {
          throw new Error(
            sourceStatus.error ??
              `Nguồn crawler báo trạng thái '${sourceStatus.status}'`,
          );
        }

        return {
          jobs: parsed.results
            .filter((job) => job.source === this.source)
            .map((job) => ({
              ...mapCrawledJobV1(job),
              source: this.source,
            })),
          query,
          error: null,
        };
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);

        this.logger.warn(
          `[crawler-api:${this.source}] truy vấn '${query}' thất bại: ${message}`,
        );

        return { jobs: [], query, error: message };
      });
  }

  private async searchAllSources(
    intent: JobSearchIntentPayload,
    query: string,
    level: string | null,
  ): Promise<CrawlerSearchResponse> {
    const baseUrl = this.config
      .get('CRAWLER_API_URL', { infer: true })
      .replace(/\/+$/, '');
    const token = this.config.get('CRAWLER_BEARER_TOKEN', { infer: true });
    const body = {
      query,
      location: intent.locations[0] ?? null,
      level,
      category_id: intent.categoryId ?? null,
      source_category_filters: intent.sourceCategoryFilters ?? {},
      keywords: [],
      max_results_per_source: intent.maxJobsPerSource,
      pages: 5,
      days: null,
      persist: false,
    };
    const key = JSON.stringify(body);
    let pending = inFlightSearches.get(key);

    if (!pending) {
      pending = this.http
        .fetchJson<unknown>(`${baseUrl}/api/v1/search`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
          timeoutMs: this.config.get('CRAWLER_API_TIMEOUT_MS', { infer: true }),
        })
        .then(parseCrawlerSearchResponse)
        .finally(() => {
          inFlightSearches.delete(key);
        });
      inFlightSearches.set(key, pending);
    }

    return pending;
  }

  private collectJobs(results: VariantResult[], maxJobs: number) {
    const jobs: CrawledJob[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      for (const job of result.jobs) {
        const key = `${job.source}:${job.sourceJobId}`;

        if (!job.sourceJobId || seen.has(key)) {
          continue;
        }

        seen.add(key);
        jobs.push(job);

        if (jobs.length >= maxJobs) {
          return jobs;
        }
      }
    }

    return jobs;
  }

  private resolveLevelFilter(intent: JobSearchIntentPayload) {
    const group = resolveSeniorityGroup(
      [intent.seniorityLevelName, intent.targetRole].join(' '),
    );

    if (!group) {
      return null;
    }

    return PYTHON_LEVEL_BY_SENIORITY_GROUP[group] ?? null;
  }
}
