import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../config/env.schema';

export interface FetchTextOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  viaBrightData?: boolean;
}

interface FetchAttemptResult {
  ok: boolean;
  status: number;
  text: string;
}

@Injectable()
export class CrawlerHttpService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async fetchText(url: string, options: FetchTextOptions = {}) {
    return this.withRetries(url, () =>
      options.viaBrightData
        ? this.fetchViaBrightData(url, options)
        : this.fetchDirect(url, options),
    );
  }

  private async fetchDirect(
    url: string,
    options: FetchTextOptions,
  ): Promise<FetchAttemptResult> {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/json',
        'user-agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
        ...options.headers,
      },
      body: options.body,
      signal: AbortSignal.timeout(
        this.config.get('JOB_RESEARCH_HTTP_TIMEOUT_MS', { infer: true }),
      ),
    });

    const text = await response.text();

    return { ok: response.ok, status: response.status, text };
  }

  async fetchJson<T>(url: string, options: FetchTextOptions = {}) {
    const text = await this.fetchText(url, options);
    return JSON.parse(text) as T;
  }

  private async fetchViaBrightData(
    url: string,
    options: FetchTextOptions,
  ): Promise<FetchAttemptResult> {
    const apiKey = this.config.get('BRIGHTDATA_API_KEY', { infer: true });

    if (!apiKey) {
      throw new Error('BRIGHTDATA_API_KEY is required for this source.');
    }

    const response = await fetch(
      this.config.get('BRIGHTDATA_REQUEST_URL', { infer: true }),
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          zone: this.config.get('BRIGHTDATA_ZONE', { infer: true }),
          url,
          format: 'raw',
          method: options.method ?? 'GET',
          headers: options.headers,
          body: options.body,
        }),
        signal: AbortSignal.timeout(
          this.config.get('BRIGHTDATA_TIMEOUT_MS', { infer: true }),
        ),
      },
    );

    const text = await response.text();

    return { ok: response.ok, status: response.status, text };
  }

  private async withRetries(
    url: string,
    attempt: () => Promise<FetchAttemptResult>,
  ) {
    const maxRetries = this.config.get('JOB_RESEARCH_HTTP_RETRIES', {
      infer: true,
    });
    let lastError: unknown;

    for (let attemptIndex = 0; attemptIndex <= maxRetries; attemptIndex += 1) {
      try {
        const response = await attempt();

        if (response.ok) {
          return response.text;
        }

        const error = new Error(
          `HTTP ${response.status} while fetching ${url}`,
        );

        if (
          !this.isRetryableStatus(response.status) ||
          attemptIndex >= maxRetries
        ) {
          throw error;
        }

        lastError = error;
      } catch (error) {
        lastError = error;

        if (!this.isRetryableError(error) || attemptIndex >= maxRetries) {
          throw error;
        }
      }

      await this.delay(500 * (attemptIndex + 1));
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Failed to fetch ${url}`);
  }

  private isRetryableStatus(status: number) {
    return (
      status === 408 ||
      status === 409 ||
      status === 425 ||
      status === 429 ||
      status >= 500
    );
  }

  private isRetryableError(error: unknown) {
    const message =
      error instanceof Error ? `${error.name} ${error.message}` : String(error);

    return /timeout|abort|network|fetch failed|econnreset|etimedout/i.test(
      message,
    );
  }

  private delay(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
