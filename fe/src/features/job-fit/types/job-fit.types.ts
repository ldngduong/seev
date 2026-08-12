export type JobFitStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface JobFitDimension { code: 'role_category' | 'technical_skills' | 'experience_scope' | 'seniority' | 'work_context'; score: number; max_score: number; rationale: string }
export interface JobFitEvidence { requirement: string; status: 'met' | 'partial' | 'gap' | 'unknown'; cv_evidence: string[]; explanation: string }
export interface JobFitResult { score: number; verdict: 'very_good' | 'good' | 'consider' | 'low'; confidence: number; summary: string; dimensions: JobFitDimension[]; requirement_evidence: JobFitEvidence[]; strengths: string[]; gaps: string[]; actions: string[] }
export interface JobFitAnalysis {
  id: string; user_cv_id: string; job_post_id: string; status: JobFitStatus; phase: string; progress: number; progress_message: string | null;
  score: number | null; verdict: string | null; confidence: number | null; result: JobFitResult | null;
  cv?: { id: string; name: string; original_file_name: string; total_pages: number } | null;
  job: { id: string; title: string; company_name: string | null; source: string; source_url: string; category_name: string | null; locations: string[]; job_type?: string | null; experience?: string | null; salary_text?: string | null; skills?: string[]; description?: string; requirements?: string; seniority_levels?: string[]; expired_at?: string | null; is_expired?: boolean };
  error: string | null; reused?: boolean; created_at: string; completed_at: string | null; updated_at: string;
}
