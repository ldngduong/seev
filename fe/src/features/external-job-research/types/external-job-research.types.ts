import type { JobFitResult } from '@/features/job-fit/types/job-fit.types'

export type ExternalJobResearchSource = 'jd' | 'link'
export interface ExternalJobResearch {
  id: string
  user_cv_id: string
  source_kind: ExternalJobResearchSource
  input_kind: 'text' | 'pdf' | 'word' | 'txt' | 'url'
  status: 'queued' | 'processing' | 'completed' | 'failed'
  phase: string
  progress: number
  progress_message: string | null
  attempt: number
  score: number | null
  verdict: string | null
  confidence: number | null
  result: JobFitResult | null
  cv?: { id: string; name: string; original_file_name: string; total_pages: number } | null
  error: string | null
  can_retry: boolean
  created_at: string
  completed_at: string | null
  updated_at: string
}

export interface ExternalJobResearchPage {
  items: ExternalJobResearch[]
  meta: { page: number; page_size: number; total: number; total_pages: number }
}
