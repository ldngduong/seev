import { ArrowLeft, FileText, RefreshCw } from 'lucide-react'
import { Link } from 'react-router'

import { DashboardPageHeader } from '@/shared/components/layouts/DashboardPageHeader'
import { Badge } from '@/shared/components/ui/badge'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import type { UserCv } from '@/entities/cv/types/cv.types'
import { CvDetailSkeleton, CvInfoPanel, CvResearchHistoryPanel } from '@/features/cv-library/components/cv-detail-panels'
import { useCvDetail } from '@/features/cv-library/hooks/use-cv-detail'
import { cn } from '@/shared/lib/utils'
import { PdfAuditViewer } from '@/features/cv-research/components/pdf-audit-viewer'
import { useUserCvPdfFile } from '@/entities/cv/hooks/use-user-cv-pdf-file'
import { ScrollArea } from '@/shared/components/ui/scroll-area'

const CV_STATUS_LABELS: Record<UserCv['status'], string> = {
  processing: 'Đang xử lý', ready: 'Sẵn sàng', failed: 'Thất bại',
}

export function MyCvDetailPage() {
  const detail = useCvDetail()
  const cv = detail.cv
  const cvFile = useUserCvPdfFile(cv?.status === 'ready' ? cv.id : null)
  if (detail.isLoading) return <CvDetailSkeleton />
  if (!cv) return <main className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-md border bg-card text-center"><FileText className="size-8 text-muted-foreground" /><div><h1 className="text-xl font-semibold">Không tìm thấy CV</h1><p className="mt-1 text-sm text-muted-foreground">CV này không tồn tại hoặc không thuộc tài khoản hiện tại.</p></div><Link to="/my-cvs" className={cn(buttonVariants({ variant: 'outline' }))}>Quay lại CV của tôi</Link></main>

  return <main className="flex w-full flex-col gap-6">
    <DashboardPageHeader title={<div className="min-w-0"><Link to="/my-cvs" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />CV của tôi</Link><div className="flex flex-wrap items-center gap-2"><h1 className="break-all text-xl font-semibold tracking-tight text-zinc-800 sm:text-2xl">{cv.name}</h1><Badge variant={cv.status === 'ready' ? 'default' : 'secondary'}>{CV_STATUS_LABELS[cv.status]}</Badge></div></div>} actions={<><Button type="button" variant="outline" onClick={detail.refresh} disabled={detail.isRefreshing}><RefreshCw className="size-4" />Làm mới</Button><Link to={`/research/new?cvId=${cv.id}`} className={cn(buttonVariants())}>Research mới</Link></>} />
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
      <ScrollArea className="min-w-0 lg:h-[calc(100vh-9rem)]"><PdfAuditViewer bare file={cvFile.data ?? null} feedbacks={[]} activeFeedback={null} />{cvFile.isError ? <p className="py-3 text-sm text-destructive">Không tải được CV đã lưu.</p> : null}</ScrollArea>
      <Tabs defaultValue="info" className="min-w-0"><TabsList variant="line" className="w-full rounded-none p-0"><TabsTrigger value="info" className="h-9 rounded-none px-4 data-active:after:bg-primary">Thông tin CV</TabsTrigger><TabsTrigger value="history" className="h-9 rounded-none px-4 data-active:after:bg-primary">Lịch sử research</TabsTrigger></TabsList><TabsContent value="info" className="mt-4"><CvInfoPanel cv={cv} /></TabsContent><TabsContent value="history" className="mt-4"><CvResearchHistoryPanel sessions={detail.sessions} isLoading={detail.isSessionsLoading} page={detail.sessionsMeta?.page ?? 1} totalPages={detail.sessionsMeta?.total_pages ?? 1} total={detail.sessionsMeta?.total ?? 0} onPageChange={detail.setHistoryPage} /></TabsContent></Tabs>
    </section>
  </main>
}
