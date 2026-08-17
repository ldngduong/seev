import { apiClient } from '@/shared/lib/api-client'

import { jobFeedResponseSchema } from '@/features/job-research/schemas/job-feed.schema'

export async function saveJob(jobId: string) {
  const { data } = await apiClient.post<{ saved: boolean }>(
    `/saved-jobs/jobs/${jobId}`,
  )

  return data
}

export async function unsaveJob(jobId: string) {
  const { data } = await apiClient.delete<{ saved: boolean }>(
    `/saved-jobs/jobs/${jobId}`,
  )

  return data
}

export async function listSavedJobs(page = 1, pageSize = 18) {
  const { data } = await apiClient.get<unknown>('/saved-jobs', {
    params: { page, pageSize },
  })

  return jobFeedResponseSchema.parse(data)
}