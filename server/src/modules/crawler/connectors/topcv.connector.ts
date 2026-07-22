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

@Injectable()
export class TopCvConnector implements JobSourceConnector {
  readonly source = 'topcv' as const;

  constructor(
    private readonly http: CrawlerHttpService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async search(intent: JobSearchIntentPayload): Promise<CrawledJob[]> {
    if (!this.config.get('TOPCV_ENABLED', { infer: true })) {
      return [];
    }

    const cards = await this.collectListingCards(intent);
    const maxDetail = Math.min(
      cards.length,
      this.config.get('TOPCV_MAX_DETAIL_JOBS', { infer: true }),
    );

    const jobs: CrawledJob[] = [];

    for (const [index, card] of cards.entries()) {
      if (index < maxDetail) {
        jobs.push(await this.enrichWithDetail(card).catch(() => card));
      } else {
        jobs.push(card);
      }
    }

    return jobs;
  }

  private async collectListingCards(intent: JobSearchIntentPayload) {
    const cards: CrawledJob[] = [];
    const seen = new Set<string>();

    for (const query of resolveJobSearchQueries(intent)) {
      if (cards.length >= intent.maxJobsPerSource) {
        break;
      }

      const html = await this.http.fetchText(this.buildSearchUrl(query), {
        viaBrightData: true,
      });
      const parsedCards = this.parseListing(html, query);

      for (const card of parsedCards) {
        const key = `${card.source}:${card.sourceJobId}`;

        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        cards.push(card);

        if (cards.length >= intent.maxJobsPerSource) {
          break;
        }
      }
    }

    return cards;
  }

  private buildSearchUrl(query: string) {
    const keyword = slugifyKeyword(query);

    return this.config
      .get('TOPCV_SEARCH_URL_TEMPLATE', { infer: true })
      .replace('{keyword}', encodeURIComponent(keyword));
  }

  private parseListing(html: string, query: string): CrawledJob[] {
    const $ = cheerio.load(html);
    const jobs: CrawledJob[] = [];

    $('.job-item-search-result[data-job-id]').each((_, element) => {
      const card = $(element);
      const sourceJobId = normalizeText(card.attr('data-job-id'));
      const link = card.find('h3.title a[href], .avatar a[href]').first();
      const title = normalizeText(
        link.attr('aria-label') || link.attr('title') || link.text(),
      );
      const sourceUrl = this.absoluteUrl(link.attr('href'));

      if (!sourceJobId || !title || !sourceUrl) {
        return;
      }

      jobs.push({
        source: this.source,
        sourceJobId,
        sourceUrl,
        title,
        companyName: normalizeText(
          card.find('.company-name, .company a, a.company').first().text() ||
            card.find('.avatar img').first().attr('alt'),
        ) || null,
        salaryText: normalizeText(
          card.find('.title-salary, .salary, .job-salary').first().text(),
        ) || null,
        locations: uniqueNonEmpty(
          card
            .find('.job-address, .location, .label-content')
            .toArray()
            .map((item) => $(item).text()),
        ),
        seniorityText: null,
        description: null,
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

  private async enrichWithDetail(job: CrawledJob): Promise<CrawledJob> {
    const html = await this.http.fetchText(job.sourceUrl, {
      viaBrightData: true,
    });
    const $ = cheerio.load(html);
    const sections = this.extractDetailSections($);

    return {
      ...job,
      salaryText:
        this.findHeaderInfo($, ['Mức lương', 'Thu nhập']) || job.salaryText,
      locations: uniqueNonEmpty([
        ...job.locations,
        this.findHeaderInfo($, ['Địa điểm']),
      ]),
      seniorityText:
        this.findHeaderInfo($, ['Kinh nghiệm']) || job.seniorityText,
      description: sections['Mô tả công việc'] || job.description,
      requirements: sections['Yêu cầu ứng viên'] || job.requirements,
      benefits:
        sections['Quyền lợi ứng viên'] ||
        sections['Quyền lợi'] ||
        job.benefits,
      raw: {
        ...job.raw,
        detailTitle: normalizeText($('title').first().text()),
      },
    };
  }

  private extractDetailSections($: cheerio.CheerioAPI) {
    const sections: Record<string, string> = {};

    $('.box-job-information-detail-item').each((_, element) => {
      const item = $(element);
      const title = normalizeText(
        item.find('.box-job-information-detail-item__title--title').text(),
      );
      const text = normalizeText(
        item.find('.box-job-information-detail-item__text').text(),
      );

      if (title && text) {
        sections[title] = text;
      }
    });

    return sections;
  }

  private findHeaderInfo($: cheerio.CheerioAPI, labels: string[]) {
    const normalizedLabels = labels.map((label) => label.toLowerCase());

    for (const element of $('.box-header-job-list-info__item').toArray()) {
      const item = $(element);
      const title = normalizeText(
        item.find('.list-info__content__title').text(),
      ).toLowerCase();

      if (normalizedLabels.some((label) => title.includes(label))) {
        return normalizeText(item.find('.list-info__content__desc').text());
      }
    }

    return null;
  }

  private absoluteUrl(value: string | undefined) {
    if (!value) {
      return '';
    }

    return new URL(
      value.replace(/&amp;/g, '&'),
      this.config.get('TOPCV_BASE_URL', { infer: true }),
    ).toString();
  }
}
