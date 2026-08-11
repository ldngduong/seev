import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router'

import { AuditResultPanel } from '@/components/audit-result-panel'
import { DashboardPageHeader } from '@/components/layouts/DashboardPageHeader'
import { PdfAuditViewer } from '@/components/pdf-audit-viewer'
import { Button, buttonVariants } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ResearchProcessingScreen } from '@/features/cv-research/components/ResearchProcessingScreen'
import { SessionJobSuggestionsPanel } from '@/features/job-research/components/SessionJobSuggestionsPanel'
import { useUserCvPdfFile } from '@/hooks/use-user-cv-pdf-file'
import { useResearchProgress } from '@/hooks/use-research-progress'
import { cn } from '@/lib/utils'
import {
  getCvResearchSession,
  retryCvResearchSession,
  retryCvResearchSessionJobs,
} from '@/services/cv-api'
import { useAuditStore } from '@/stores/audit-store'
import type { CvResearchSession } from '@/types/cv'

export function ResearchSessionDetailPage() {
  const { sessionId } = useParams()
  const queryClient = useQueryClient()
  const selectedFeedbackId = useAuditStore((state) => state.selectedFeedbackId)
  const setSelectedFeedbackId = useAuditStore((state) => state.setSelectedFeedbackId)
  const sessionQuery = useQuery({
    queryKey: ['cv-research-session', sessionId],
    queryFn: () => getCvResearchSession(sessionId as string),
    enabled: Boolean(sessionId),
  })
  const session = sessionQuery.data
  const cvFileQuery = useUserCvPdfFile(session?.cv.id)
  const audit = session?.audit ?? null
  const retryJobsMutation = useMutation({
    mutationFn: retryCvResearchSessionJobs,
    onSuccess: (nextSession) => {
      queryClient.setQueryData(['cv-research-session', nextSession.id], nextSession)
      void queryClient.invalidateQueries({ queryKey: ['cv-research-sessions'] })
    },
  })
  const retryResearchMutation = useMutation({
    mutationFn: retryCvResearchSession,
    onSuccess: (nextSession) => {
      queryClient.setQueryData(['cv-research-session', nextSession.id], nextSession)
      void queryClient.invalidateQueries({ queryKey: ['cv-research-sessions'] })
    },
  })
  const handleProgress = useCallback(
    (event: import('@/types/research-progress').ResearchProgressEvent) => {
      if (event.session_id !== sessionId) return
      queryClient.setQueryData<CvResearchSession>(
        ['cv-research-session', sessionId],
        (current) => current ? {
          ...current,
          status: event.status,
          phase: event.phase,
          progress: event.progress,
          progress_message: event.message,
          attempt: event.attempt,
          error: event.error,
          updated_at: event.updated_at,
        } : current,
      )
      if (event.phase === 'job_matching' || ['completed', 'failed'].includes(event.status)) {
        void sessionQuery.refetch()
      }
    },
    [queryClient, sessionId, sessionQuery],
  )
  useResearchProgress(handleProgress, () => void sessionQuery.refetch())
  const activeFeedback = useMemo(
    () => audit?.detailed_feedbacks.find((feedback) => feedback.id === selectedFeedbackId) ?? null,
    [audit, selectedFeedbackId],
  )

  useEffect(() => {
    setSelectedFeedbackId(audit?.detailed_feedbacks[0]?.id ?? null)
  }, [audit?.audit_id, audit?.detailed_feedbacks, setSelectedFeedbackId])

  if (sessionQuery.isLoading) {
    return <ResearchProcessingScreen progress={0} message="Đang tải research..." />
  }
  if (!session) {
    return <main className="text-sm text-destructive">Không tìm thấy research.</main>
  }

  const researchIsActive = ['queued', 'processing'].includes(session.status)
  const canRetryJobs = Boolean(audit && session.job_search_intent_id)
  if (researchIsActive && !audit) {
    return (
      <main className="flex w-full flex-col gap-5">
        <DashboardPageHeader
          title={session.cv.name}
          actions={<HistoryLink />}
        />
        <ResearchProcessingScreen
          progress={session.progress}
          message={session.progress_message}
        />
      </main>
    )
  }

  return (
    <main className="flex w-full flex-col gap-5">
      <DashboardPageHeader
        title={session.cv.name}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={!canRetryJobs || retryJobsMutation.isPending || researchIsActive}
              onClick={() => retryJobsMutation.mutate(session.id)}
            >
              {retryJobsMutation.isPending ? 'Đang thử lại...' : 'Thử lại gợi ý việc làm'}
            </Button>
            <HistoryLink />
          </>
        }
      />

      {researchIsActive ? (
        <section className="space-y-2 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <p className="text-muted-foreground">{session.progress_message}</p>
            <span className="tabular-nums text-muted-foreground">{session.progress}%</span>
          </div>
          <Progress value={session.progress} />
        </section>
      ) : null}

      {session.status === 'failed' ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{session.error || 'Research thất bại.'}</p>
          <Button
            type="button"
            onClick={() => canRetryJobs
              ? retryJobsMutation.mutate(session.id)
              : retryResearchMutation.mutate(session.id)}
            disabled={retryResearchMutation.isPending || retryJobsMutation.isPending}
          >
            {retryResearchMutation.isPending || retryJobsMutation.isPending
              ? 'Đang thử lại...'
              : canRetryJobs ? 'Thử lại gợi ý việc làm' : 'Thử lại research'}
          </Button>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:items-start">
        <ScrollArea className="min-w-0 lg:h-[calc(100vh-9rem)]">
          <PdfAuditViewer
            bare
            file={cvFileQuery.data ?? null}
            feedbacks={audit?.detailed_feedbacks ?? []}
            activeFeedback={activeFeedback}
          />
          {cvFileQuery.isError ? (
            <p className="py-3 text-sm text-destructive">
              Không tải được CV đã lưu. Làm mới trang và thử lại.
            </p>
          ) : null}
        </ScrollArea>

        <ScrollArea className="lg:h-[calc(100vh-9rem)]">
          <aside className="pr-1">
            <AuditResultPanel audit={audit} />
          </aside>
        </ScrollArea>
      </section>

      <SessionJobSuggestionsPanel
        jobs={session.job_suggestions}
        status={session.status}
        intentId={session.job_search_intent_id}
        onRetry={session.job_search_intent_id ? () => retryJobsMutation.mutate(session.id) : undefined}
        isRetrying={retryJobsMutation.isPending}
      />
    </main>
  )
}

function HistoryLink() {
  return (
    <Link
      to="/research-history"
      className={cn(buttonVariants({ variant: 'outline' }))}
    >
      Quay lại lịch sử
    </Link>
  )
}
