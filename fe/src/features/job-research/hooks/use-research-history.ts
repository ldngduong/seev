import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useDeferredValue, useState } from 'react'

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

const PAGE_SIZE = 10

export function useResearchHistory() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearchValue] = useState('')
  const [status, setStatusValue] = useState('all')
  const [type, setTypeValue] = useState('all')
  const [cvId, setCvIdValue] = useState('all')
  const deferredSearch = useDeferredValue(search.trim())
  const cvsQuery = useQuery({
    queryKey: ['user-cvs', { page: 1, purpose: 'research-history-filter' }],
    queryFn: () => listUserCvs({ page: 1, pageSize: MAX_CV_PAGE_SIZE }),
  })
  const sessionsQuery = useQuery({
    queryKey: ['cv-research-sessions', { page, search: deferredSearch, status, type, cvId }],
    queryFn: () => listCvResearchSessions({
      page,
      pageSize: PAGE_SIZE,
      search: deferredSearch || undefined,
      status: status === 'all' ? undefined : status,
      type: type === 'all' ? undefined : type as 'quick' | 'custom',
      userCvId: cvId === 'all' ? undefined : cvId,
    }),
    placeholderData: keepPreviousData,
  })
  const retryMutation = useMutation({
    mutationFn: retryCvResearchSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cv-research-sessions'] }),
  })
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

  const resetPage = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  return {
    sessions: sessionsQuery.data?.items ?? [],
    meta: sessionsQuery.data?.meta,
    cvs: cvsQuery.data?.items ?? [],
    search, setSearch: resetPage(setSearchValue),
    status, setStatus: resetPage(setStatusValue),
    type, setType: resetPage(setTypeValue),
    cvId, setCvId: resetPage(setCvIdValue),
    setPage,
    isLoading: sessionsQuery.isLoading,
    isError: sessionsQuery.isError,
    isRefreshing: sessionsQuery.isFetching,
    refresh: () => void sessionsQuery.refetch(),
    retry: retryMutation.mutate,
    retryingSessionId: retryMutation.isPending ? retryMutation.variables : undefined,
  }
}
