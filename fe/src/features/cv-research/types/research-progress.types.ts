import type { CvResearchSession } from '@/entities/cv/types/cv.types'

export interface ResearchProgressEvent {
  user_id: string
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
