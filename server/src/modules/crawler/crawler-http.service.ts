import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../config/env.schema';

export interface FetchTextOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  viaBrightData?: boolean;
}

@Injectable()
export class CrawlerHttpService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async fetchText(url: string, options: FetchTextOptions = {}) {
    if (options.viaBrightData) {
      return this.fetchViaBrightData(url, options);
    }

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

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while fetching ${url}`);
    }

    return text;
  }

  async fetchJson<T>(url: string, options: FetchTextOptions = {}) {
    const text = await this.fetchText(url, options);
    return JSON.parse(text) as T;
  }

  private async fetchViaBrightData(url: string, options: FetchTextOptions) {
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

    if (!response.ok) {
      throw new Error(
        `Bright Data HTTP ${response.status} while fetching ${url}`,
      );
    }

    return text;
  }
}
