export interface JobCrawlRun {
  id: string
  intentId: string
  source: 'topcv' | 'vietnamworks' | 'indeed'
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
  requestedSources: Array<'topcv' | 'vietnamworks' | 'indeed'>
  completedSources: Array<'topcv' | 'vietnamworks' | 'indeed'>
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
  source: 'topcv' | 'vietnamworks' | 'indeed'
  sourceJobId: string
  sourceUrl: string
  title: string
  companyName: string | null
  salaryText: string | null
  locations: string[]
  seniorityText: string | null
  jobCategoryId: number | null
  jobCategoryName: string | null
  seniorityLevelId: string | null
  seniorityLevelName: string | null
  description: string | null
  requirements: string | null
  benefits: string | null
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
  job: JobPost
}
