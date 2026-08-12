import type { ExternalJobResearchInput, ExternalJobResearchSource } from '../entities/external-job-research.entity';

export const EXTERNAL_JOB_RESEARCH_QUEUE = 'external-job-research';
export const EXTERNAL_JOB_RESEARCH_JOB = 'analyze-external-job';

export interface ExternalJobResearchJobData {
  researchId: string;
  attempt: number;
  sourceKind: ExternalJobResearchSource;
  inputKind: ExternalJobResearchInput;
  /** Transient payload. It is never written to PostgreSQL. */
  content: string;
  contentResolved?: boolean;
}
