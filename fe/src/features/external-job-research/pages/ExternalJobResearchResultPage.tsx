import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router'

import { useUserCvPdfFile } from '@/entities/cv/hooks/use-user-cv-pdf-file'
import { PdfAuditViewer } from '@/features/cv-research/components/pdf-audit-viewer'
import { ResearchProcessingScreen } from '@/features/cv-research/components/ResearchProcessingScreen'
import { useAuditStore } from '@/features/cv-research/store/audit-store'
import { JobFitAssessment } from '@/features/job-fit/components/job-fit-result-panel'
import { buildJobFitGapFeedbacks } from '@/features/job-fit/utils/job-fit-feedbacks'
import { DashboardPageHeader } from '@/shared/components/layouts/DashboardPageHeader'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { cn } from '@/shared/lib/utils'
import { useExternalJobResearch, useRetryExternalJobResearch } from '../hooks/use-external-job-research'

export function ExternalJobResearchResultPage() {
  const { researchId } = useParams()
  const query = useExternalJobResearch(researchId)
  const research = query.data
  const retry = useRetryExternalJobResearch(researchId)
  const cvFile = useUserCvPdfFile(research?.cv?.id)
  const selectedFeedbackId = useAuditStore((state) => state.selectedFeedbackId)
  const setSelectedFeedbackId = useAuditStore((state) => state.setSelectedFeedbackId)
  const feedbacks = useMemo(() => buildJobFitGapFeedbacks(research?.result?.requirement_evidence ?? [], 'external-job'), [research?.result?.requirement_evidence])
  const activeFeedback = feedbacks.find((item) => item.id === selectedFeedbackId) ?? null
  useEffect(() => { setSelectedFeedbackId(feedbacks[0]?.id ?? null) }, [feedbacks, setSelectedFeedbackId])

  if (query.isLoading || !research) return <ResearchProcessingScreen progress={0} message="Đang tải phiên đánh giá..." />
  if (research.status === 'queued' || research.status === 'processing') return <ResearchProcessingScreen progress={research.progress} message={research.progress_message} />
  return <main className="flex w-full flex-col gap-5">
    <DashboardPageHeader title={<div><h1 className="text-2xl font-semibold tracking-tight text-zinc-800">Đánh giá theo {research.source_kind === 'link' ? 'liên kết tuyển dụng' : 'JD'}</h1><p className="mt-1 text-sm text-muted-foreground">Đối chiếu với CV: {research.cv?.name ?? 'CV đã chọn'}</p></div>} actions={<><Link to="/research-history" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>Lịch sử research</Link></>} />
    {research.status === 'failed' ? <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><p>{research.progress_message}</p>{research.can_retry ? <Button type="button" size="sm" className="mt-3" onClick={() => retry.mutate()} disabled={retry.isPending}>{retry.isPending ? 'Đang thử lại...' : 'Thử lại'}</Button> : null}</section> : null}
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:items-start">
      <ScrollArea className="min-w-0 lg:h-[calc(100vh-9rem)]"><PdfAuditViewer bare file={cvFile.data ?? null} feedbacks={feedbacks} activeFeedback={activeFeedback} />{cvFile.isError ? <p className="py-3 text-sm text-destructive">Không tải được CV đã lưu.</p> : null}</ScrollArea>
      <ScrollArea className="lg:h-[calc(100vh-9rem)]"><aside className="flex flex-col gap-6 pr-1 [&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">{research.result ? <JobFitAssessment result={research.result} /> : null}</aside></ScrollArea>
    </section>
  </main>
}
