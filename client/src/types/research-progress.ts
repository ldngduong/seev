import type { CvResearchSession } from './cv'

export interface ResearchProgressEvent {
  session_id: string
  user_cv_id: string
  status: CvResearchSession['status']
  phase: CvResearchSession['phase']
  progress: number
  message: string | null
  attempt: number
  error: string | null
  updated_at: string
}
