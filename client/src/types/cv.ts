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
