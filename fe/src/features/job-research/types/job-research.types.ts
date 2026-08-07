export type JobSourceName =
  | 'topcv'
  | 'vietnamworks'
  | 'indeed'
  | 'topdev'
  | 'itviec'
  | 'jobsgo'
  | 'viecoi'

export interface JobCrawlRun {
  id: string
  intentId: string
  source: JobSourceName
  status: 'queued' | 'processing' | 'completed' | 'failed'
  fetchedCount: number
  savedCount: number
  error: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface JobSearchIntent {
  id: string
  auditId: string | null
  userId: string | null
  targetRole: string | null
  jobCategoryId: number | null
  jobCategoryName: string | null
  seniorityLevelId: string | null
  seniorityLevelName: string | null
  status: 'queued' | 'processing' | 'completed' | 'failed'
  keywords: string[]
  locations: string[]
  requestedSources: Array<JobSourceName>
  completedSources: Array<JobSourceName>
  totalJobs: number
  maxJobsPerSource: number
  error: string | null
  createdAt: string
  updatedAt: string
  runs: JobCrawlRun[]
}

export interface JobResearchIntentResponse {
  intent: JobSearchIntent
  queue_job_id: string | number | undefined
}

export interface JobPost {
  id: string
  source: JobSourceName
  sourceJobId: string
  sourceUrl: string
  title: string
  companyName: string | null
  salaryText: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  jobType: string | null
  level: string | null
  experience: string | null
  logo: string | null
  locations: string[]
  seniorityText: string | null
  jobCategoryId: number | null
  jobCategoryName: string | null
  seniorityLevelId: string | null
  seniorityLevelName: string | null
  skills: string[]
  postedAt: string | null
  expiredAt: string | null
  lastSeenAt: string
  createdAt: string
  updatedAt: string
}

export interface JobIntentMatchResult {
  match_score: number
  matched_terms: string[]
  match_kind: 'match' | 'suggestion' | 'reject'
  match_reason: string
  job: JobPost
}
