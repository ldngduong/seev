import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router'

import { useUserCvPdfFile } from '@/entities/cv/hooks/use-user-cv-pdf-file'
import { PdfAuditViewer } from '@/features/cv-research/components/pdf-audit-viewer'
import { ResearchProcessingScreen } from '@/features/cv-research/components/ResearchProcessingScreen'
import { useAuditStore } from '@/features/cv-research/store/audit-store'
import { DashboardPageHeader } from '@/shared/components/layouts/DashboardPageHeader'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { cn } from '@/shared/lib/utils'
import { JobFitResultPanel } from '../components/job-fit-result-panel'
import { useJobFit, useRetryJobFit } from '../hooks/use-job-fit'
import { buildJobFitGapFeedbacks } from '../utils/job-fit-feedbacks'

export function JobFitResultPage() {
  const { analysisId } = useParams()
  const query = useJobFit(analysisId)
  const analysis = query.data
  const retry = useRetryJobFit(analysisId)
  const cvFile = useUserCvPdfFile(analysis?.cv?.id)
  const selectedFeedbackId = useAuditStore((state) => state.selectedFeedbackId)
  const setSelectedFeedbackId = useAuditStore((state) => state.setSelectedFeedbackId)
  const feedbacks = useMemo(() => buildJobFitGapFeedbacks(analysis?.result?.requirement_evidence ?? [], 'job-fit'), [analysis?.result?.requirement_evidence])
  const activeFeedback = feedbacks.find((feedback) => feedback.id === selectedFeedbackId) ?? null

  useEffect(() => { setSelectedFeedbackId(feedbacks[0]?.id ?? null) }, [feedbacks, setSelectedFeedbackId])

  if (query.isLoading || !analysis) return <ResearchProcessingScreen progress={0} message="Đang tải phiên đánh giá..." />
  if (analysis.status === 'queued' || analysis.status === 'processing') {
    return <ResearchProcessingScreen progress={analysis.progress} message={analysis.progress_message} />
  }
  return (
    <main className="flex w-full flex-col gap-5">
      <DashboardPageHeader
        title={(
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-800">
              {analysis.job.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Đối chiếu với CV: {analysis.cv?.name || 'CV đã chọn'}
            </p>
          </div>
        )}
        actions={<>{analysis.status === 'failed' ? <Button type="button" size="sm" onClick={() => retry.mutate()} disabled={retry.isPending || analysis.job.is_expired}>{retry.isPending ? 'Đang thử lại...' : 'Thử lại'}</Button> : null}<Link to="/research-history" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>Lịch sử research</Link></>}
      />
      {analysis.status === 'failed' ? <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Đánh giá chưa hoàn tất. Credit của lần chạy lỗi đã được hoàn lại.{analysis.job.is_expired ? ' Việc làm đã hết hạn nên không thể chạy lại.' : ''}</section> : null}
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:items-start">
        <ScrollArea className="min-w-0 lg:h-[calc(100vh-9rem)]">
          <PdfAuditViewer bare file={cvFile.data ?? null} feedbacks={feedbacks} activeFeedback={activeFeedback} />
          {cvFile.isError ? <p className="py-3 text-sm text-destructive">Không tải được CV đã lưu.</p> : null}
        </ScrollArea>
        <ScrollArea className="lg:h-[calc(100vh-9rem)]"><JobFitResultPanel analysis={analysis} /></ScrollArea>
      </section>
    </main>
  )
}
