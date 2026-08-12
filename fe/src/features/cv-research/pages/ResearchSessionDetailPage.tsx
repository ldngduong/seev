import { AuditResultPanel } from '@/features/cv-research/components/audit-result-panel'
import { DashboardPageHeader } from '@/shared/components/layouts/DashboardPageHeader'
import { PdfAuditViewer } from '@/features/cv-research/components/pdf-audit-viewer'
import { Button } from '@/shared/components/ui/button'
import { Progress } from '@/shared/components/ui/progress'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { ResearchProcessingScreen } from '@/features/cv-research/components/ResearchProcessingScreen'
import { SessionJobSuggestionsPanel } from '@/features/job-research/components/SessionJobSuggestionsPanel'
import { ResearchHistoryLink } from '@/features/cv-research/components/research-history-link'
import { useResearchSessionDetail } from '@/features/cv-research/hooks/use-research-session-detail'

export function ResearchSessionDetailPage() {
  const detail = useResearchSessionDetail()
  const { session, audit, activeFeedback, researchIsActive, canRetryJobs } = detail

  if (detail.isLoading) {
    return <ResearchProcessingScreen progress={0} message="Đang tải research..." />
  }
  if (!session) {
    return <main className="text-sm text-destructive">Không tìm thấy research.</main>
  }

  if (researchIsActive && !audit) {
    return (
      <main className="flex w-full flex-col gap-5">
        <DashboardPageHeader
          title={session.cv.name}
          actions={<ResearchHistoryLink />}
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
              disabled={!canRetryJobs || detail.isRetryingJobs || researchIsActive}
              onClick={detail.retryJobs}
            >
              {detail.isRetryingJobs ? 'Đang thử lại...' : 'Thử lại gợi ý việc làm'}
            </Button>
            <ResearchHistoryLink />
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
              ? detail.retryJobs()
              : detail.retryResearch()}
            disabled={detail.isRetryingResearch || detail.isRetryingJobs}
          >
            {detail.isRetryingResearch || detail.isRetryingJobs
              ? 'Đang thử lại...'
              : canRetryJobs ? 'Thử lại gợi ý việc làm' : 'Thử lại research'}
          </Button>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:items-start">
        <ScrollArea className="min-w-0 lg:h-[calc(100vh-9rem)]">
          <PdfAuditViewer
            bare
            file={detail.cvFile}
            feedbacks={audit?.detailed_feedbacks ?? []}
            activeFeedback={activeFeedback}
          />
          {detail.isCvFileError ? (
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
        onRetry={session.job_search_intent_id ? detail.retryJobs : undefined}
        isRetrying={detail.isRetryingJobs}
      />
    </main>
  )
}
