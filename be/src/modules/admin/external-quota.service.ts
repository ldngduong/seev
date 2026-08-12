import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../config/env.schema';

@Injectable()
export class ExternalQuotaService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async getAll() {
    const [deepseek, firecrawl] = await Promise.all([this.getDeepseek(), this.getFirecrawl()]);
    return { providers: [deepseek, firecrawl], fetched_at: new Date() };
  }

  private async getDeepseek() {
    const apiKey = this.config.get('DEEPSEEK_API_KEY', { infer: true });
    if (!apiKey) return { provider: 'deepseek', status: 'unconfigured', data: null, error: null };
    const baseUrl = this.config.get('DEEPSEEK_BASE_URL', { infer: true }).replace(/\/$/, '');
    return this.fetchProvider('deepseek', `${baseUrl}/user/balance`, apiKey, (body) => body);
  }

  private async getFirecrawl() {
    const apiKey = this.config.get('FIRECRAWL_API_KEY', { infer: true });
    if (!apiKey) return { provider: 'firecrawl', status: 'unconfigured', data: null, error: null };
    const baseUrl = this.config.get('FIRECRAWL_BASE_URL', { infer: true }).replace(/\/$/, '');
    return this.fetchProvider('firecrawl', `${baseUrl}/team/credit-usage`, apiKey, (body) => {
      const response = body as { success?: boolean; data?: unknown };
      return response.data ?? body;
    });
  }

  private async fetchProvider(provider: string, url: string, apiKey: string, transform: (body: unknown) => unknown) {
    try {
      const response = await fetch(url, { headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
      const body = await response.json() as unknown;
      if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body).slice(0, 300)}`);
      return { provider, status: 'available', data: transform(body), error: null };
    } catch (error) {
      return { provider, status: 'unavailable', data: null, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
