import type { JobSource } from './job-source.type';

export interface JobSearchIntentPayload {
  intentId: string;
  auditId: string | null;
  targetRole: string | null;
  jobCategoryId: number | null;
  jobCategoryName: string | null;
  seniorityLevelId: string | null;
  seniorityLevelName: string | null;
  keywords: string[];
  searchQueries: string[];
  locations: string[];
  sources: JobSource[];
  maxJobsPerSource: number;
}

export interface CrawledJob {
  source: JobSource;
  sourceJobId: string;
  sourceUrl: string;
  title: string;
  companyName: string | null;
  salaryText: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  locations: string[];
  seniorityText: string | null;
  experienceMin: number | null;
  experienceMax: number | null;
  jobType: string | null;
  level: string | null;
  experience: string | null;
  skills: string[];
  postedAt: Date | null;
  expiredAt: Date | null;
  logo: string | null;
  raw: Record<string, unknown>;
}

export interface JobSourceConnector {
  readonly source: JobSource;
  search(intent: JobSearchIntentPayload): Promise<CrawledJob[]>;
}
