import { apiClient } from '@/shared/lib/api-client'
import type { ExternalJobResearch, ExternalJobResearchPage } from '../types/external-job-research.types'

export async function createJdResearch(input: { userCvId: string; text?: string; file?: File }) {
  const body = new FormData()
  body.append('userCvId', input.userCvId)
  if (input.text) body.append('text', input.text)
  if (input.file) body.append('document', input.file)
  const { data } = await apiClient.post<ExternalJobResearch>('/external-job-research/jd', body)
  return data
}

export async function createLinkResearch(input: { userCvId: string; url: string }) {
  const { data } = await apiClient.post<ExternalJobResearch>('/external-job-research/link', input)
  return data
}

export async function getExternalJobResearch(id: string) {
  const { data } = await apiClient.get<ExternalJobResearch>(`/external-job-research/${id}`)
  return data
}

export async function listExternalJobResearches(query: { page?: number; pageSize?: number; status?: string; userCvId?: string; sourceKind?: string; search?: string } = {}) {
  const { data } = await apiClient.get<ExternalJobResearchPage>('/external-job-research', { params: query })
  return data
}

export async function retryExternalJobResearch(id: string) {
  const { data } = await apiClient.post<ExternalJobResearch>(`/external-job-research/${id}/retry`)
  return data
}
