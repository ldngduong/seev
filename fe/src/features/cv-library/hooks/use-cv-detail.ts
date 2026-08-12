import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router'

import {
  listCvResearchSessions,
  listUserCvs,
  MAX_CV_PAGE_SIZE,
  type PaginatedResponse,
} from '@/entities/cv/api/cv-api'
import type { CvResearchSession } from '@/entities/cv/types/cv.types'
import { useResearchProgress } from '@/features/cv-research/hooks/use-research-progress'
import type { ResearchProgressEvent } from '@/features/cv-research/types/research-progress.types'

export function useCvDetail() {
  const { cvId } = useParams()
  const queryClient = useQueryClient()
  const [historyPage, setHistoryPage] = useState(1)
  const cvsQuery = useQuery({
    queryKey: ['user-cvs', { search: cvId, purpose: 'detail' }],
    queryFn: () => listUserCvs({ page: 1, pageSize: MAX_CV_PAGE_SIZE }),
  })
  const sessionsQuery = useQuery({
    queryKey: ['cv-research-sessions', { userCvId: cvId, page: historyPage }],
    queryFn: () => listCvResearchSessions({ page: historyPage, pageSize: 6, userCvId: cvId }),
    enabled: Boolean(cvId),
  })
  const handleProgress = useCallback((event: ResearchProgressEvent) => {
    queryClient.setQueriesData<PaginatedResponse<CvResearchSession>>(
      { queryKey: ['cv-research-sessions'] },
      (current) => current ? {
        ...current,
        items: current.items.map((session) => session.id === event.session_id ? {
          ...session,
          status: event.status,
          phase: event.phase,
          progress: event.progress,
          progress_message: event.message,
          attempt: event.attempt,
          error: event.error,
          updated_at: event.updated_at,
        } : session),
      } : current,
    )
    if (['completed', 'failed'].includes(event.status)) {
      void sessionsQuery.refetch()
      void queryClient.invalidateQueries({ queryKey: ['billing', 'account'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'me'] })
    }
  }, [queryClient, sessionsQuery])

  useResearchProgress(handleProgress, () => void sessionsQuery.refetch())

  return {
    cv: cvsQuery.data?.items.find((item) => item.id === cvId),
    sessions: sessionsQuery.data?.items ?? [],
    sessionsMeta: sessionsQuery.data?.meta,
    isLoading: cvsQuery.isLoading,
    isSessionsLoading: sessionsQuery.isLoading,
    isRefreshing: cvsQuery.isFetching || sessionsQuery.isFetching,
    refresh: () => {
      void cvsQuery.refetch()
      void sessionsQuery.refetch()
    },
    setHistoryPage,
  }
}
