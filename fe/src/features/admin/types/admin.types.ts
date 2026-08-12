export interface AdminDashboard {
  summary: {
    users: number
    new_users_30d: number
    researches: number
    researches_30d: number
    completed_30d: number
    failed_30d: number
    consumed_credits_30d: string
    success_rate: number | null
    user_growth: number | null
    research_growth: number | null
    credit_growth: number | null
  }
  trend: Array<{ date: string; users: number; researches: number; credits: number }>
  service_breakdown: Array<{ service_code: string; service_name: string; uses: number; credits: string }>
  latest_crawl: { id: string; trigger_type: 'scheduled' | 'manual'; status: string; progress: number; saved_jobs: number; failed_targets: number; created_at: string; completed_at: string | null } | null
}
export interface AdminUser { id: string; full_name: string; email: string; username: string | null; role: 'user' | 'admin'; credits: string; created_at: string }
export interface AdminUserDetail {
  user: { id: string; fullName: string; email: string; username: string | null; role: 'user' | 'admin'; createdAt: string }
  account: { balance: string }
  transactions: CreditTransaction[]
  sessions: unknown[]
  cvs: unknown[]
  activities: ActivityLog[]
}
export interface CreditTransaction { id: string; type: string; amount_delta: string; balance_before: string; balance_after: string; reason: string | null; metadata: Record<string, unknown>; created_at: string }
export interface ActivityLog { id: string; action: string; resourceType: string | null; resourceId: string | null; status: 'success' | 'failed'; metadata: Record<string, unknown>; createdAt: string }
export interface ServiceProduct { id: string; code: 'quick_research' | 'manual_research' | 'job_fit_analysis'; name: string; description: string | null; price_credits: string; is_active: boolean; version: number; updated_at: string }
export interface ExternalQuota { provider: 'deepseek' | 'firecrawl'; status: 'available' | 'unconfigured' | 'unavailable'; data: Record<string, unknown> | null; error: string | null }
export interface CrawlRun { id: string; trigger_type: 'scheduled' | 'manual'; status: string; phase: string; progress: number; progress_message: string | null; total_targets: number; completed_targets: number; failed_targets: number; total_jobs: number; saved_jobs: number; current_source: string | null; current_category: string | null; cancel_requested: boolean; bull_job_id: string | null; report: Record<string, unknown> | null; error: string | null; created_at: string; started_at: string | null; completed_at: string | null; updated_at: string }
export interface CrawlRunItem { id: string; source: string; crawl_url: string; category_ids: string[]; category_names: string; status: string; fetched_count: number; saved_count: number; duration_ms: number | null; error: string | null; started_at: string | null; completed_at: string | null }
export interface CrawlRunDetail extends CrawlRun { items: CrawlRunItem[] }
export interface CrawlProgressEvent { run_id: string; status: string; phase: string; progress: number; message: string | null; total_targets: number; completed_targets: number; failed_targets: number; total_jobs: number; saved_jobs: number; current_source: string | null; current_category: string | null; cancel_requested: boolean; updated_at: string }
export interface QueueOverview { counts: Record<string, number>; schedule: Array<{ key: string; name: string; pattern: string; next: number }>; jobs: Array<{ id: string; name: string; state: string; run_id: string | null; scheduled: boolean; timestamp: number; delay: number; failed_reason: string | null; attempts_made: number }> }
export interface PageResponse<T> { items: T[]; meta: { page: number; page_size: number; total: number; total_pages: number } }
