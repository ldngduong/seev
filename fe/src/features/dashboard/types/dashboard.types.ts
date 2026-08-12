export interface UserDashboard {
  summary: {
    balance: string
    cv_count: number
    researches_30d: number
    completed_30d: number
    failed_30d: number
    active_researches: number
    credits_used_30d: string
    success_rate: number | null
  }
  trend: Array<{ date: string; total: number; completed: number; failed: number }>
  service_breakdown: Array<{ service_code: string; service_name: string; uses: number; credits: string }>
  recent_researches: Array<{
    id: string
    type: 'quick' | 'custom'
    status: 'queued' | 'processing' | 'completed' | 'failed'
    progress: number
    progress_message: string | null
    job_category_name: string | null
    seniority_level_name: string | null
    suggestion_count: number
    created_at: string
    completed_at: string | null
  }>
}
