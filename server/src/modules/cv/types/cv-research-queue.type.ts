export const CV_RESEARCH_QUEUE = 'cv-research';
export const CV_RESEARCH_JOB = 'process-cv-research';

export interface CvResearchJobData {
  sessionId: string;
  attempt: number;
}
