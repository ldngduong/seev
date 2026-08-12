import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async forUser(userId: string) {
    const [summary] = await this.dataSource.query(`
      SELECT
        COALESCE((SELECT balance FROM credit_accounts WHERE user_id = $1), 0)::text AS balance,
        (SELECT count(*)::int FROM user_cvs WHERE user_id = $1 AND status = 'ready') AS cv_count,
        count(*) FILTER (WHERE s.created_at >= now() - interval '30 days')::int AS researches_30d,
        count(*) FILTER (WHERE s.status = 'completed' AND s.created_at >= now() - interval '30 days')::int AS completed_30d,
        count(*) FILTER (WHERE s.status = 'failed' AND s.created_at >= now() - interval '30 days')::int AS failed_30d,
        count(*) FILTER (WHERE s.status IN ('queued', 'processing'))::int AS active_researches,
        COALESCE((SELECT sum(total_credits) FROM service_usages WHERE user_id = $1 AND status = 'consumed' AND created_at >= now() - interval '30 days'), 0)::text AS credits_used_30d
      FROM cv_research_sessions s WHERE s.user_id = $1
    `, [userId]) as Array<Record<string, unknown>>;

    const [trend, services, recent] = await Promise.all([
      this.dataSource.query(`
        WITH days AS (SELECT generate_series(current_date - interval '29 days', current_date, interval '1 day')::date AS day),
        sessions AS (
          SELECT created_at::date AS day, count(*)::int AS total,
            count(*) FILTER (WHERE status = 'completed')::int AS completed,
            count(*) FILTER (WHERE status = 'failed')::int AS failed
          FROM cv_research_sessions WHERE user_id = $1 AND created_at >= current_date - interval '29 days'
          GROUP BY created_at::date
        )
        SELECT to_char(days.day, 'YYYY-MM-DD') AS date, COALESCE(total, 0)::int AS total,
          COALESCE(completed, 0)::int AS completed, COALESCE(failed, 0)::int AS failed
        FROM days LEFT JOIN sessions USING (day) ORDER BY days.day
      `, [userId]),
      this.dataSource.query(`
        SELECT service_code, service_name, count(*)::int AS uses, COALESCE(sum(total_credits), 0)::text AS credits
        FROM service_usages WHERE user_id = $1 AND status = 'consumed' AND created_at >= now() - interval '30 days'
        GROUP BY service_code, service_name ORDER BY uses DESC
      `, [userId]),
      this.dataSource.query(`
        SELECT id, type, status, progress, progress_message, job_category_name, seniority_level_name,
          jsonb_array_length(job_suggestions_snapshot) AS suggestion_count, created_at, completed_at
        FROM cv_research_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5
      `, [userId]),
    ]);

    const totalFinished = Number(summary.completed_30d) + Number(summary.failed_30d);
    return {
      summary: { ...summary, success_rate: totalFinished ? Math.round((Number(summary.completed_30d) / totalFinished) * 100) : null },
      trend, service_breakdown: services, recent_researches: recent,
    };
  }
}
