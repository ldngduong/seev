import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../config/env.schema';

export interface CategoryCrawlReport {
  runId: string;
  totalJobs: number;
  saved: number;
  errors: string[];
  perSource: Array<{ source: string; count: number }>;
  perCategory: Array<{
    categoryId: string | null;
    categoryName: string;
    count: number;
  }>;
}

/**
 * Gửi email thông báo kết quả category crawl qua Resend HTTP API.
 * Tắt khi thiếu RESEND_API_KEY hoặc CRAWL_NOTIFY_EMAIL.
 */
@Injectable()
export class CrawlNotifyService {
  private readonly logger = new Logger(CrawlNotifyService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async sendCategoryCrawlReport(report: CategoryCrawlReport): Promise<void> {
    const apiKey = this.config.get('RESEND_API_KEY', { infer: true });
    const to = this.config.get('CRAWL_NOTIFY_EMAIL', { infer: true });

    if (!apiKey || !to) {
      this.logger.log(
        'Bỏ qua thông báo crawl: chưa cấu hình RESEND_API_KEY/CRAWL_NOTIFY_EMAIL',
      );
      return;
    }

    const from = this.config.get('MAIL_FROM', { infer: true });

    const sourceRows = report.perSource
      .map(
        (row) =>
          `<tr><td style="padding:6px 12px;border:1px solid #e2e8f0">${this.escapeHtml(
            row.source,
          )}</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:right">${row.count}</td></tr>`,
      )
      .join('');
    const categoryRows = report.perCategory
      .map(
        (row) =>
          `<tr><td style="padding:6px 12px;border:1px solid #e2e8f0">${this.escapeHtml(
            row.categoryName || '(chưa map)',
          )}</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:right">${row.count}</td></tr>`,
      )
      .join('');
    const errorText =
      report.errors.length > 0
        ? `<p style="color:#b91c1c">Lỗi (${report.errors.length}): ${this.escapeHtml(
            report.errors.join('; '),
          )}</p>`
        : '<p style="color:#15803d">Không có lỗi.</p>';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">
        <h2 style="color:#1e293b">Category crawl hoàn thành</h2>
        <p style="color:#475569">Run <code>${this.escapeHtml(report.runId)}</code> — tổng <b>${
          report.totalJobs
        }</b> job crawl được (sau map category), <b>${report.saved}</b> job đã lưu/cập nhật vào job_posts.</p>
        <h3 style="color:#1e293b">Theo source</h3>
        <table style="border-collapse:collapse;width:100%">
          <thead><tr style="background:#f1f5f9"><th style="padding:6px 12px;border:1px solid #e2e8f0;text-align:left">Source</th><th style="padding:6px 12px;border:1px solid #e2e8f0;text-align:right">Số job</th></tr></thead>
          <tbody>${sourceRows || '<tr><td colspan="2" style="padding:6px 12px">—</td></tr>'}</tbody>
        </table>
        <h3 style="color:#1e293b">Theo category</h3>
        <table style="border-collapse:collapse;width:100%">
          <thead><tr style="background:#f1f5f9"><th style="padding:6px 12px;border:1px solid #e2e8f0;text-align:left">Category</th><th style="padding:6px 12px;border:1px solid #e2e8f0;text-align:right">Số job</th></tr></thead>
          <tbody>${categoryRows || '<tr><td colspan="2" style="padding:6px 12px">—</td></tr>'}</tbody>
        </table>
        ${errorText}
        <p style="color:#94a3b8;font-size:12px">Seev — báo cáo crawl tự động</p>
      </div>`;

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: `[Seev] Category crawl ${report.runId}: ${report.totalJobs} việc làm`,
          html,
          text: `Category crawl ${report.runId} hoàn thành.\nTổng: ${
            report.totalJobs
          } job crawl được, ${report.saved} job đã lưu.\n\nTheo source:\n${report.perSource
            .map((row) => `- ${row.source}: ${row.count}`)
            .join('\n')}\n\nTheo category:\n${report.perCategory
            .map((row) => `- ${row.categoryName || '(chưa map)'}: ${row.count}`)
            .join('\n')}\n\nLỗi: ${
            report.errors.length > 0 ? report.errors.join('; ') : 'không có'
          }`,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Resend ${response.status}: ${body.slice(0, 300)}`);
      }

      this.logger.log(
        `Đã gửi thông báo crawl tới ${to} (${report.totalJobs} việc làm)`,
      );
    } catch (error) {
      this.logger.error(
        `Gửi thông báo crawl thất bại: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
