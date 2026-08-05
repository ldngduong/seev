import type {
  CvResearchPhase,
  CvResearchStatus,
} from '../../cv/entities/cv-research-session.entity';

export const RESEARCH_PROGRESS_EVENT = 'research:progress';

export interface ResearchProgressEvent {
  session_id: string;
  user_cv_id: string;
  status: CvResearchStatus;
  phase: CvResearchPhase;
  progress: number;
  message: string | null;
  attempt: number;
  error: string | null;
  updated_at: Date;
}
