import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { useParams } from 'react-router'

import { getCvResearchSession, retryCvResearchSession, retryCvResearchSessionJobs } from '@/entities/cv/api/cv-api'
import { useUserCvPdfFile } from '@/entities/cv/hooks/use-user-cv-pdf-file'
import type { CvResearchSession } from '@/entities/cv/types/cv.types'
import { useResearchProgress } from '@/features/cv-research/hooks/use-research-progress'
import { useAuditStore } from '@/features/cv-research/store/audit-store'
import type { ResearchProgressEvent } from '@/features/cv-research/types/research-progress.types'
import { useBilling } from '@/features/billing/hooks/use-billing'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { toast } from 'sonner'

export function useResearchSessionDetail() {
  const { sessionId } = useParams()
  const queryClient = useQueryClient()
  const billing = useBilling()
  const selectedFeedbackId = useAuditStore((state) => state.selectedFeedbackId)
  const setSelectedFeedbackId = useAuditStore((state) => state.setSelectedFeedbackId)
  const sessionQuery = useQuery({
    queryKey: ['cv-research-session', sessionId],
    queryFn: () => getCvResearchSession(sessionId as string),
    enabled: Boolean(sessionId),
  })
  const session = sessionQuery.data
  const audit = session?.audit ?? null
  const cvFileQuery = useUserCvPdfFile(session?.cv.id)
  const updateSession = (nextSession: CvResearchSession) => {
    queryClient.setQueryData(['cv-research-session', nextSession.id], nextSession)
    void queryClient.invalidateQueries({ queryKey: ['cv-research-sessions'] })
    void queryClient.invalidateQueries({ queryKey: ['billing', 'account'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard', 'me'] })
  }
  const retryJobsMutation = useMutation({
    mutationFn: retryCvResearchSessionJobs,
    onSuccess: updateSession,
    onError: (error) => toast.error(getApiErrorMessage(error, 'Không thể thử lại gợi ý việc làm.')),
  })
  const retryResearchMutation = useMutation({
    mutationFn: retryCvResearchSession,
    onSuccess: updateSession,
    onError: (error) => toast.error(getApiErrorMessage(error, 'Không thể thử lại research.')),
  })
  const handleProgress = useCallback((event: ResearchProgressEvent) => {
    if (event.session_id !== sessionId) return
    queryClient.setQueryData<CvResearchSession>(['cv-research-session', sessionId], (current) => current ? {
      ...current,
      status: event.status,
      phase: event.phase,
      progress: event.progress,
      progress_message: event.message,
      attempt: event.attempt,
      error: event.error,
      updated_at: event.updated_at,
    } : current)
    if (event.phase === 'job_matching' || ['completed', 'failed'].includes(event.status)) void sessionQuery.refetch()
    if (['completed', 'failed'].includes(event.status)) { void queryClient.invalidateQueries({ queryKey: ['billing', 'account'] }); void queryClient.invalidateQueries({ queryKey: ['dashboard', 'me'] }) }
  }, [queryClient, sessionId, sessionQuery])
  useResearchProgress(handleProgress, () => void sessionQuery.refetch())
  const activeFeedback = useMemo(() => audit?.detailed_feedbacks.find((feedback) => feedback.id === selectedFeedbackId) ?? null, [audit, selectedFeedbackId])

  useEffect(() => {
    setSelectedFeedbackId(audit?.detailed_feedbacks[0]?.id ?? null)
  }, [audit?.audit_id, audit?.detailed_feedbacks, setSelectedFeedbackId])

  return {
    session,
    audit,
    activeFeedback,
    cvFile: cvFileQuery.data ?? null,
    isCvFileError: cvFileQuery.isError,
    isLoading: sessionQuery.isLoading,
    researchIsActive: Boolean(session && ['queued', 'processing'].includes(session.status)),
    canRetryJobs: Boolean(audit && session?.job_search_intent_id),
    retryJobsPrice: billing.products.find((product) => product.code === 'job_suggestion_retry')?.price_credits ?? null,
    retryJobs: () => session && retryJobsMutation.mutate(session.id),
    retryResearch: () => session && retryResearchMutation.mutate(session.id),
    isRetryingJobs: retryJobsMutation.isPending,
    isRetryingResearch: retryResearchMutation.isPending,
  }
}
