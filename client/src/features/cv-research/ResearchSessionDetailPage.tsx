import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { AuditResultPanel } from '@/components/audit-result-panel'
import { DashboardPageHeader } from '@/components/layouts/DashboardPageHeader'
import {
  PdfAuditViewer,
  type HighlightStats,
} from '@/components/pdf-audit-viewer'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { SessionJobSuggestionsPanel } from '@/features/job-research/components/SessionJobSuggestionsPanel'
import { useUserCvPdfFile } from '@/hooks/use-user-cv-pdf-file'
import { cn } from '@/lib/utils'
import {
  getCvResearchSession,
  retryCvResearchSessionJobs,
} from '@/services/cv-api'
import { useAuditStore } from '@/stores/audit-store'

export function ResearchSessionDetailPage() {
  const { sessionId } = useParams()
  const queryClient = useQueryClient()
  const [highlightStats, setHighlightStats] = useState<HighlightStats | null>(
    null,
  )
  const selectedFeedbackId = useAuditStore((state) => state.selectedFeedbackId)
  const setSelectedFeedbackId = useAuditStore(
    (state) => state.setSelectedFeedbackId,
  )
  const sessionQuery = useQuery({
    queryKey: ['cv-research-session', sessionId],
    queryFn: () => getCvResearchSession(sessionId as string),
    enabled: Boolean(sessionId),
    refetchInterval: (query) =>
      query.state.data?.status === 'processing' ? 3_000 : false,
  })
  const session = sessionQuery.data
  const cvFileQuery = useUserCvPdfFile(session?.cv.id)
  const audit = session?.audit ?? null
  const retryJobsMutation = useMutation({
    mutationFn: retryCvResearchSessionJobs,
    onSuccess: (nextSession) => {
      queryClient.setQueryData(
        ['cv-research-session', nextSession.id],
        nextSession,
      )
      void queryClient.invalidateQueries({ queryKey: ['cv-research-sessions'] })
    },
  })
  const activeFeedback = useMemo(
    () =>
      audit?.detailed_feedbacks.find(
        (feedback) => feedback.id === selectedFeedbackId,
      ) ?? null,
    [audit, selectedFeedbackId],
  )

  useEffect(() => {
    setSelectedFeedbackId(audit?.detailed_feedbacks[0]?.id ?? null)
  }, [audit?.audit_id, audit?.detailed_feedbacks, setSelectedFeedbackId])

  if (sessionQuery.isLoading) {
    return <main className="text-sm text-muted-foreground">Loading...</main>
  }

  if (!session) {
    return <main className="text-sm text-destructive">Research not found.</main>
  }

  return (
    <main className="flex w-full flex-col gap-6">
      <DashboardPageHeader
        title={session.cv.name}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={
                !session.job_search_intent_id || retryJobsMutation.isPending
              }
              onClick={() => retryJobsMutation.mutate(session.id)}
            >
              {retryJobsMutation.isPending ? 'Retrying...' : 'Retry jobs'}
            </Button>
            <Link
              to="/research-history"
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              Back to history
            </Link>
          </>
        }
      />

      <section className="grid min-h-[680px] gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div className="flex min-h-[620px] flex-col rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-700">
                PDF viewer
              </h2>
              <p className="text-sm text-muted-foreground">
                Replayed from stored research snapshot.
              </p>
            </div>
            <Badge variant="outline">
              {highlightStats
                ? `${highlightStats.matchedCount}/${highlightStats.totalCount} highlights`
                : 'Highlights'}
            </Badge>
          </div>
          <PdfAuditViewer
            file={cvFileQuery.data ?? null}
            feedbacks={audit?.detailed_feedbacks ?? []}
            activeFeedback={activeFeedback}
            onHighlightStatsChange={setHighlightStats}
          />
          {cvFileQuery.isError ? (
            <p className="border-t px-4 py-3 text-sm text-destructive">
              Could not load stored CV file from backend.
            </p>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <AuditResultPanel audit={audit} />
          <SessionJobSuggestionsPanel
            jobs={session.job_suggestions}
            status={session.status}
            onRetry={
              session.job_search_intent_id
                ? () => retryJobsMutation.mutate(session.id)
                : undefined
            }
            isRetrying={retryJobsMutation.isPending}
          />
        </aside>
      </section>
    </main>
  )
}
