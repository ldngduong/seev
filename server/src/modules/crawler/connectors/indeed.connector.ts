import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cheerio from 'cheerio';

import type { Env } from '../../../config/env.schema';
import { CrawlerHttpService } from '../crawler-http.service';
import type {
  CrawledJob,
  JobSearchIntentPayload,
  JobSourceConnector,
} from '../types/crawled-job.type';
import {
  normalizeText,
  slugifyKeyword,
  uniqueNonEmpty,
} from '../utils/text-normalizer';
import { resolveJobSearchQueries } from '../utils/job-search-query';
import { resolveIndeedSearchParams } from '../utils/source-seniority-filters';

@Injectable()
export class IndeedConnector implements JobSourceConnector {
  readonly source = 'indeed' as const;

  constructor(
    private readonly http: CrawlerHttpService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async search(intent: JobSearchIntentPayload): Promise<CrawledJob[]> {
    if (!this.config.get('INDEED_ENABLED', { infer: true })) {
      return [];
    }

    const jobs: CrawledJob[] = [];
    const seen = new Set<string>();

    for (const query of resolveJobSearchQueries(intent)) {
      if (jobs.length >= intent.maxJobsPerSource) {
        break;
      }

      const html = await this.http.fetchText(
        this.buildSearchUrl(intent, query),
        {
          viaBrightData: true,
        },
      );

      for (const job of this.parseListing(html, query)) {
        const key = `${job.source}:${job.sourceJobId}`;

        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        jobs.push(job);

        if (jobs.length >= intent.maxJobsPerSource) {
          break;
        }
      }
    }

    return jobs;
  }

  private buildSearchUrl(intent: JobSearchIntentPayload, query: string) {
    const keyword = slugifyKeyword(query);
    const location = intent.locations[0] || '';
    const rawUrl = this.config
      .get('INDEED_SEARCH_URL_TEMPLATE', { infer: true })
      .replace('{keyword}', encodeURIComponent(keyword))
      .replace('{location}', encodeURIComponent(location));
    const url = new URL(rawUrl);
    const params = resolveIndeedSearchParams(intent);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    return url.toString();
  }

  private parseListing(html: string, query: string): CrawledJob[] {
    const $ = cheerio.load(html);
    const jobs: CrawledJob[] = [];

    $('[data-jk]').each((_, element) => {
      const card = $(element);
      const sourceJobId = normalizeText(card.attr('data-jk'));

      if (!sourceJobId || jobs.some((job) => job.sourceJobId === sourceJobId)) {
        return;
      }

      const title = normalizeText(
        card.find('[aria-label]').first().attr('aria-label') ||
          card.find('h2, a').first().text(),
      ).replace(/^chi tiết đầy đủ về\s*/i, '');

      if (!title) {
        return;
      }

      jobs.push({
        source: this.source,
        sourceJobId,
        sourceUrl: `${this.config.get('INDEED_BASE_URL', {
          infer: true,
        })}/viewjob?jk=${encodeURIComponent(sourceJobId)}`,
        title,
        companyName:
          normalizeText(
            card
              .find('[data-testid="company-name"], .companyName')
              .first()
              .text(),
          ) || null,
        salaryText:
          normalizeText(
            card
              .find('[data-testid="attribute_snippet_testid"]')
              .first()
              .text(),
          ) || null,
        locations: uniqueNonEmpty([
          card.find('[data-testid="text-location"], .companyLocation').text(),
        ]),
        seniorityText: null,
        description:
          normalizeText(
            card.find('.job-snippet, [data-testid="job-snippet"]').text(),
          ) || null,
        requirements: null,
        benefits: null,
        skills: [],
        postedAt: null,
        expiredAt: null,
        raw: {
          html: normalizeText(card.text()),
          searchQuery: query,
        },
      });
    });

    return jobs;
  }
}
