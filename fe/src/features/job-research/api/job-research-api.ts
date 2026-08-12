import { apiClient } from '@/shared/lib/api-client'

import { jobFeedResponseSchema } from '../schemas/job-feed.schema'
import type { JobFeedQuery } from '../types/job-feed.types'
import type {
  JobIntentMatchResult,
  JobResearchIntentResponse,
  JobSearchIntent,
} from '../types/job-research.types'

export async function getJobFeed(query: JobFeedQuery = {}) {
  const { data } = await apiClient.get<unknown>('/job-research/feed', {
    params: query,
  })

  return jobFeedResponseSchema.parse(data)
}

export async function listJobResearchIntents(limit = 30) {
  const { data } = await apiClient.get<JobSearchIntent[]>(
    '/job-research/intents',
    {
      params: { limit },
    },
  )

  return data
}

export async function createJobResearchFromAudit(auditId: string) {
  const { data } = await apiClient.post<JobResearchIntentResponse>(
    `/cv/audits/${auditId}/job-research`,
    {},
  )

  return data
}

export async function getJobResearchIntent(intentId: string) {
  const { data } = await apiClient.get<JobSearchIntent>(
    `/job-research/intents/${intentId}`,
  )

  return data
}

export async function getJobResearchJobs(intentId: string, limit?: number) {
  const { data } = await apiClient.get<JobIntentMatchResult[]>(
    `/job-research/intents/${intentId}/jobs`,
    {
      params: limit === undefined ? undefined : { limit },
    },
  )

  return data
}
