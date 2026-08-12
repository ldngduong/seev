import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isIP } from 'node:net';
import { load } from 'cheerio';

import type { Env } from '../../config/env.schema';
import { InvalidRecruitmentContentError } from './errors/invalid-recruitment-content.error';

@Injectable()
export class FirecrawlRecruitmentService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async scrape(rawUrl: string) {
    const url = this.validateUrl(rawUrl);
    const apiKey = this.config.get('FIRECRAWL_API_KEY', { infer: true });
    if (!apiKey) throw new BadGatewayException('Dịch vụ đọc liên kết chưa được cấu hình.');
    const baseUrl = this.config.get('FIRECRAWL_BASE_URL', { infer: true }).replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/scrape`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true, blockAds: true, removeBase64Images: true, timeout: 30_000, proxy: 'auto' }),
      signal: AbortSignal.timeout(45_000),
    });
    const payload = await response.json().catch(() => null) as { success?: boolean; data?: { markdown?: string }; markdown?: string; error?: string } | null;
    if ([400, 403, 404, 422].includes(response.status)) throw new InvalidRecruitmentContentError('Không thể đọc nội dung tuyển dụng từ liên kết đã cung cấp.');
    if (!response.ok || !payload?.success) throw new BadGatewayException('Không thể đọc liên kết tuyển dụng lúc này.');
    const markdown = payload.data?.markdown ?? payload.markdown ?? '';
    return markdown.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 50_000);
  }

  async resolveFacebookLink(rawUrl: string) {
    const url = this.validateUrl(rawUrl);
    if (!this.isFacebookHost(new URL(url).hostname)) return { content: url, resolved: false };
    const embedUrl = new URL('https://www.facebook.com/plugins/post.php');
    embedUrl.searchParams.set('href', url);
    embedUrl.searchParams.set('show_text', 'true');
    embedUrl.searchParams.set('width', '500');
    embedUrl.searchParams.set('_fb_noscript', '1');
    let response: Response;
    try {
      response = await fetch(embedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Seev/1.0)', 'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8' },
        redirect: 'follow',
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new BadGatewayException('Không thể kết nối Facebook lúc này.');
    }
    if (!response.ok) throw new BadGatewayException('Không thể đọc bài Facebook lúc này.');
    const html = await response.text();
    const page = load(html);
    page('script,style,noscript,svg').remove();
    const content = page('body').text().replace(/\s+/g, ' ').trim();
    if (!content || /bài viết này trên facebook không còn nữa|this content isn't available|content is not available/i.test(content)) {
      throw new BadRequestException('Facebook không cho phép hệ thống đọc bài viết này. Nếu đây là bài trong nhóm hoặc bài giới hạn quyền xem, hãy sao chép nội dung và dùng mục “Cung cấp JD”.');
    }
    return { content: content.slice(0, 50_000), resolved: true };
  }

  private validateUrl(rawUrl: string) {
    let url: URL;
    try { url = new URL(rawUrl); } catch { throw new BadRequestException('Liên kết không hợp lệ.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new BadRequestException('Liên kết không hợp lệ.');
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host === '0.0.0.0' || host === '::1' || (isIP(host) && this.isPrivateIp(host))) {
      throw new BadRequestException('Không hỗ trợ liên kết nội bộ.');
    }
    return url.toString();
  }

  private isPrivateIp(host: string) {
    return /^(?:10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host) || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:');
  }

  private isFacebookHost(host: string) {
    const normalized = host.toLowerCase();
    return normalized === 'facebook.com' || normalized.endsWith('.facebook.com') || normalized === 'fb.com' || normalized.endsWith('.fb.com');
  }
}
