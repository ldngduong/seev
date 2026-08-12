import { apiClient } from '@/shared/lib/api-client'
import type { JobFitAnalysis } from '../types/job-fit.types'

export async function createJobFit(jobId: string, userCvId: string) {
  const { data } = await apiClient.post<JobFitAnalysis>(`/job-fit/jobs/${jobId}`, { userCvId })
  return data
}
export async function getJobFit(id: string) {
  const { data } = await apiClient.get<JobFitAnalysis>(`/job-fit/${id}`)
  return data
}

export async function retryJobFit(id: string) {
  const { data } = await apiClient.post<JobFitAnalysis>(`/job-fit/${id}/retry`)
  return data
}

export async function listJobFits(query: { page?: number; pageSize?: number; status?: string; userCvId?: string; search?: string } = {}) {
  const { data } = await apiClient.get<{ items: JobFitAnalysis[]; meta: { page: number; page_size: number; total: number; total_pages: number } }>('/job-fit', { params: query })
  return data
}
