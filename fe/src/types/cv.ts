export type FeedbackSeverity = 'info' | 'warning' | 'critical'
export type HighlightColor = 'yellow' | 'red'

export interface AuditFeedback {
  id: string
  source_line_id: string
  section: string
  original_text: string
  highlight_text: string
  severity: FeedbackSeverity
  issue: string
  suggestion: string
  highlight_color: HighlightColor
}

export interface SuggestedJob {
  title: string
  reason: string
  match_level: 'high' | 'medium' | 'stretch'
}

export interface GeneralFeedback {
  id: string
  topic: string
  severity: FeedbackSeverity
  comment: string
  recommendation: string
}

export interface ScoreBreakdownItem {
  dimension: string
  score: number
  max_score: number
  rationale: string
}

export interface AuditSummary {
  audit_id: string
  file_name: string
  total_pages: number
  overall_score: number
  summary: string
  score_breakdown: ScoreBreakdownItem[]
  general_feedbacks: GeneralFeedback[]
  detailed_feedbacks: AuditFeedback[]
  suggested_keywords: string[]
  suggested_roles: string[]
  suggested_jobs: SuggestedJob[]
}

export interface CvAuditHistoryItem {
  audit_id: string
  file_name: string
  target_role: string | null
  job_category_id: number | null
  job_category_name: string | null
  seniority_level_id: string | null
  seniority_level_name: string | null
  status: 'queued' | 'processing' | 'completed' | 'failed'
  overall_score: number | null
  total_pages: number
  suggested_keywords: string[]
  suggested_roles: string[]
  created_at: string
  updated_at: string
}

export interface UserCv {
  id: string
  name: string
  original_file_name: string
  file_url: string
  mime_type: string
  size_bytes: number
  status: 'processing' | 'ready' | 'failed'
  total_pages: number
  created_at: string
  updated_at: string
}

export interface CvResearchJobSuggestion {
  match_score: number
  matched_terms: string[]
  job: {
    id: string
    source: string
    source_url: string
    title: string
    company_name: string | null
    salary_text: string | null
    locations: string[]
    seniority_text: string | null
    skills: string[]
  }
}

export interface CvResearchSession {
  id: string
  type: 'quick' | 'custom'
  target_source: 'ai_inferred' | 'job_category' | 'job_description'
  status: 'queued' | 'processing' | 'completed' | 'failed'
  phase:
    | 'queued'
    | 'target_inference'
    | 'cv_audit'
    | 'job_matching'
    | 'completed'
    | 'failed'
  progress: number
  progress_message: string | null
  attempt: number
  cv: UserCv
  cv_file_url: string
  audit: AuditSummary | null
  job_search_intent_id: string | null
  job_suggestions: CvResearchJobSuggestion[]
  target: {
    target_role: string | null
    job_category_id: number | null
    job_category_name: string | null
    seniority_level_id: string | null
    seniority_level_name: string | null
    job_description: string | null
  }
  created_at: string
  completed_at: string | null
  started_at: string | null
  updated_at: string
  error: string | null
}
