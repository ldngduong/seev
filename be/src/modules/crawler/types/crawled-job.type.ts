import type { JobSource } from './job-source.type';

export interface JobSearchIntentPayload {
  intentId: string;
  auditId: string | null;
  targetRole: string | null;
  jobCategoryId: string | null;
  jobCategoryName: string | null;
  seniorityLevelId: string | null;
  seniorityLevelName: string | null;
  keywords: string[];
  searchQueries: string[];
  locations: string[];
  sources: JobSource[];
  maxJobsPerSource: number;
  categoryId?: string | null;
  sourceCategoryFilters?: Partial<Record<JobSource, Record<string, string>>>;
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
  sourceSeniorityKey: string | null;
  sourceSeniorityText: string | null;
  seniorityMatches: Array<{
    code: string;
    mappingMethod: string;
    confidence: number;
    evidence: Record<string, unknown>;
    isPrimary: boolean;
  }>;
  experienceMin: number | null;
  experienceMax: number | null;
  jobType: string | null;
  experience: string | null;
  skills: string[];
  postedAt: Date | null;
  expiredAt: Date | null;
  logo: string | null;
  categoryId: string | null;
  categoryName: string | null;
  raw: Record<string, unknown>;
  description: string | null;
  requirements: string | null;
  detailSource: string | null;
  detailParserVersion: number | null;
}

export interface JobSourceConnector {
  readonly source: JobSource;
  search(intent: JobSearchIntentPayload): Promise<CrawledJob[]>;
}
