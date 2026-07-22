import { apiClient } from '@/services/api-client'

import type {
  JobIntentMatchResult,
  JobResearchIntentResponse,
  JobSearchIntent,
} from '../types/job-research.types'

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

export async function getJobResearchJobs(intentId: string, limit = 12) {
  const { data } = await apiClient.get<JobIntentMatchResult[]>(
    `/job-research/intents/${intentId}/jobs`,
    {
      params: { limit },
    },
  )

  return data
}
