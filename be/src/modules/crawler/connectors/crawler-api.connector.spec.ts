import { ConfigService } from '@nestjs/config';

import type { Env } from '../../../config/env.schema';
import { CrawlerHttpService } from '../crawler-http.service';
import { CrawlerApiConnector } from './crawler-api.connector';

describe('CrawlerApiConnector.searchFixedCategory', () => {
  it('retries a transient per-source fetch failure', async () => {
    jest.useFakeTimers();
    const fetchJson = jest
      .fn()
      .mockResolvedValueOnce({
        results: [],
        per_source: {
          itviec: {
            source: 'itviec',
            status: 'error',
            count: 0,
            error: 'fetch failed',
            elapsed_ms: 30_000,
          },
        },
        total: 0,
        elapsed_ms: 30_000,
      })
      .mockResolvedValueOnce({
        results: [],
        per_source: {
          itviec: {
            source: 'itviec',
            status: 'ok',
            count: 0,
            error: null,
            elapsed_ms: 100,
          },
        },
        total: 0,
        elapsed_ms: 100,
      });
    const http = {
      fetchJson,
    } as unknown as CrawlerHttpService;
    const config = {
      get: jest.fn((key: keyof Env) => {
        if (key === 'CRAWLER_API_URL') return 'http://localhost:8000';
        if (key === 'CRAWLER_BEARER_TOKEN') return '';
        if (key === 'CRAWLER_API_TIMEOUT_MS') return 180_000;
        return undefined;
      }),
    } as unknown as ConfigService<Env, true>;
    const connector = new CrawlerApiConnector('itviec', http, config);

    const pending = connector.searchFixedCategory({
      categoryIds: ['category-id'],
      categoryCandidates: { 'category-id': ['Backend Engineering'] },
      crawlUrl: 'https://itviec.com/it-jobs/backend-developer',
      expectedSourceLabel: 'Backend Developer',
      maxJobs: 25,
    });
    await jest.advanceTimersByTimeAsync(1_000);

    await expect(pending).resolves.toEqual([]);
    expect(fetchJson).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
