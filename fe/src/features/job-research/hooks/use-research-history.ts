import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import {
  listCvResearchSessions,
  listUserCvs,
  MAX_CV_PAGE_SIZE,
  retryCvResearchSession,
  type PaginatedResponse,
} from '@/entities/cv/api/cv-api'
import type { CvResearchSession } from '@/entities/cv/types/cv.types'
import { useResearchProgress } from '@/features/cv-research/hooks/use-research-progress'
import type { ResearchProgressEvent } from '@/features/cv-research/types/research-progress.types'
import { listJobFits, retryJobFit } from '@/features/job-fit/api/job-fit-api'
import type { JobFitAnalysis } from '@/features/job-fit/types/job-fit.types'
import { researchSocket } from '@/features/cv-research/api/research-socket'
import { useEffect } from 'react'
import { listExternalJobResearches, retryExternalJobResearch } from '@/features/external-job-research/api/external-job-research-api'
import type { ExternalJobResearch } from '@/features/external-job-research/types/external-job-research.types'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'

const PAGE_SIZE = 10

export function useResearchHistory() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearchValue] = useState('')
  const [status, setStatusValue] = useState('all')
  const [type, setTypeValue] = useState<'quick' | 'custom' | 'job_fit' | 'external'>('quick')
  const [cvId, setCvIdValue] = useState('all')
  const debouncedSearch = useDebouncedValue(search.trim())
  const cvsQuery = useQuery({
    queryKey: ['user-cvs', { page: 1, purpose: 'research-history-filter' }],
    queryFn: () => listUserCvs({ page: 1, pageSize: MAX_CV_PAGE_SIZE }),
  })
  const sessionsQuery = useQuery({
    queryKey: ['cv-research-sessions', { page, search: debouncedSearch, status, type, cvId }],
    queryFn: () => listCvResearchSessions({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: status === 'all' ? undefined : status,
      type: type as 'quick' | 'custom',
      userCvId: cvId === 'all' ? undefined : cvId,
    }),
    placeholderData: keepPreviousData,
    enabled: type === 'quick' || type === 'custom',
  })
  const jobFitsQuery = useQuery({
    queryKey: ['job-fits', { page, search: debouncedSearch, status, cvId }],
    queryFn: () => listJobFits({ page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined, status: status === 'all' ? undefined : status, userCvId: cvId === 'all' ? undefined : cvId }),
    placeholderData: keepPreviousData,
    enabled: type === 'job_fit',
  })
  const externalQuery = useQuery({
    queryKey: ['external-job-researches', { page, search: debouncedSearch, status, cvId }],
    queryFn: () => listExternalJobResearches({ page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined, status: status === 'all' ? undefined : status, userCvId: cvId === 'all' ? undefined : cvId }),
    placeholderData: keepPreviousData,
    enabled: type === 'external',
  })
  const retryMutation = useMutation({
    mutationFn: retryCvResearchSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cv-research-sessions'] }),
  })
  const retryJobFitMutation = useMutation({
    mutationFn: retryJobFit,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['job-fits'] })
      void queryClient.invalidateQueries({ queryKey: ['billing', 'account'] })
    },
  })
  const retryExternalMutation = useMutation({ mutationFn: retryExternalJobResearch, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['external-job-researches'] }); void queryClient.invalidateQueries({ queryKey: ['billing', 'account'] }) } })
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['cv-research-sessions'] })
  }, [queryClient])
  const handleProgress = useCallback((event: ResearchProgressEvent) => {
    queryClient.setQueriesData<PaginatedResponse<CvResearchSession>>(
      { queryKey: ['cv-research-sessions'] },
      (current) => current ? {
        ...current,
        items: current.items.map((item) => item.id === event.session_id ? {
          ...item,
          status: event.status,
          phase: event.phase,
          progress: event.progress,
          progress_message: event.message,
          attempt: event.attempt,
          error: event.error,
          updated_at: event.updated_at,
        } : item),
      } : current,
    )
    if (['completed', 'failed'].includes(event.status)) {
      refresh()
      void queryClient.invalidateQueries({ queryKey: ['billing', 'account'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'me'] })
    }
  }, [queryClient, refresh])
  useResearchProgress(handleProgress, refresh)
  useEffect(() => {
    const handleJobFit = (analysis: JobFitAnalysis) => {
      queryClient.setQueriesData<{ items: JobFitAnalysis[]; meta: { page: number; page_size: number; total: number; total_pages: number } }>(
        { queryKey: ['job-fits'] },
        (current) => current ? { ...current, items: current.items.map((item) => item.id === analysis.id ? analysis : item) } : current,
      )
      if (analysis.status === 'completed' || analysis.status === 'failed') {
        void queryClient.invalidateQueries({ queryKey: ['job-fits'] })
        void queryClient.invalidateQueries({ queryKey: ['billing', 'account'] })
      }
    }
    researchSocket.on('job-fit:progress', handleJobFit)
    const handleExternal = (research: ExternalJobResearch) => {
      queryClient.setQueriesData<{ items: ExternalJobResearch[]; meta: { page: number; page_size: number; total: number; total_pages: number } }>({ queryKey: ['external-job-researches'] }, (current) => current ? { ...current, items: current.items.map((item) => item.id === research.id ? { ...item, ...research } : item) } : current)
      if (research.status === 'completed' || research.status === 'failed') { void queryClient.invalidateQueries({ queryKey: ['external-job-researches'] }); void queryClient.invalidateQueries({ queryKey: ['billing', 'account'] }) }
    }
    researchSocket.on('external-job-research:progress', handleExternal)
    researchSocket.connect()
    return () => { researchSocket.off('job-fit:progress', handleJobFit); researchSocket.off('external-job-research:progress', handleExternal) }
  }, [queryClient])

  const resetPage = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  return {
    sessions: type === 'quick' || type === 'custom' ? sessionsQuery.data?.items ?? [] : [],
    jobFits: type === 'job_fit' ? jobFitsQuery.data?.items ?? [] : [],
    externalResearches: type === 'external' ? externalQuery.data?.items ?? [] : [],
    meta: type === 'job_fit' ? jobFitsQuery.data?.meta : type === 'external' ? externalQuery.data?.meta : sessionsQuery.data?.meta,
    cvs: cvsQuery.data?.items ?? [],
    search, setSearch: resetPage(setSearchValue),
    status, setStatus: resetPage(setStatusValue),
    type, setType: (value: 'quick' | 'custom' | 'job_fit' | 'external') => { setTypeValue(value); setPage(1) },
    cvId, setCvId: resetPage(setCvIdValue),
    setPage,
    isLoading: type === 'job_fit' ? jobFitsQuery.isLoading : type === 'external' ? externalQuery.isLoading : sessionsQuery.isLoading,
    isError: type === 'job_fit' ? jobFitsQuery.isError : type === 'external' ? externalQuery.isError : sessionsQuery.isError,
    isRefreshing: type === 'job_fit' ? jobFitsQuery.isFetching : type === 'external' ? externalQuery.isFetching : sessionsQuery.isFetching,
    refresh: () => void (type === 'job_fit' ? jobFitsQuery.refetch() : type === 'external' ? externalQuery.refetch() : sessionsQuery.refetch()),
    retry: retryMutation.mutate,
    retryingSessionId: retryMutation.isPending ? retryMutation.variables : undefined,
    retryJobFit: retryJobFitMutation.mutate,
    retryingJobFitId: retryJobFitMutation.isPending ? retryJobFitMutation.variables : undefined,
    retryExternal: retryExternalMutation.mutate,
    retryingExternalId: retryExternalMutation.isPending ? retryExternalMutation.variables : undefined,
  }
}
