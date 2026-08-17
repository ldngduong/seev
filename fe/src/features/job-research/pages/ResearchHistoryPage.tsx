import { FileText, Search } from 'lucide-react'
import { Link } from 'react-router'

import { DataPagination } from '@/shared/components/data/DataPagination'
import { DashboardPageHeader } from '@/shared/components/layouts/DashboardPageHeader'
import { buttonVariants } from '@/shared/components/ui/button'
import { Combobox } from '@/shared/components/ui/combobox'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { ResearchHistoryItem } from '@/features/job-research/components/research-history-item'
import { EmptyResearchHistory, ResearchHistorySkeleton } from '@/features/job-research/components/research-history-states'
import { useResearchHistory } from '@/features/job-research/hooks/use-research-history'
import { cn } from '@/shared/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { JobFitHistoryItem } from '@/features/job-fit/components/job-fit-history-item'
import { ExternalJobResearchHistoryItem } from '@/features/external-job-research/components/external-job-research-history-item'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' }, { value: 'queued', label: 'Đang chờ' },
  { value: 'processing', label: 'Đang xử lý' }, { value: 'completed', label: 'Hoàn tất' },
  { value: 'failed', label: 'Thất bại' },
]
export function ResearchHistoryPage() {
  const history = useResearchHistory()
  return <main className="flex w-full flex-col gap-5">
    <DashboardPageHeader title="Lịch sử research" actions={history.type !== 'job_fit' ? <Link to={`/research/new?mode=${history.type}`} className={cn(buttonVariants())}><FileText />Research mới</Link> : null} />
    <section className="grid gap-3">
      <Tabs value={history.type} onValueChange={(value) => history.setType(value as 'quick' | 'custom' | 'job_fit' | 'external')}>
        <TabsList className="grid h-auto w-full grid-cols-2 grid-rows-2 items-stretch gap-1 rounded-xl p-1 sm:h-10 sm:grid-cols-4 sm:grid-rows-1 sm:gap-0" variant="default">
          <TabsTrigger value="quick" className="h-10 min-h-10 whitespace-normal px-2 py-2 text-xs leading-tight sm:h-full sm:min-h-0 sm:px-3 sm:py-0 sm:text-sm">Nhanh</TabsTrigger>
          <TabsTrigger value="custom" className="h-10 min-h-10 whitespace-normal px-2 py-2 text-xs leading-tight sm:h-full sm:min-h-0 sm:px-3 sm:py-0 sm:text-sm">Tùy chỉnh</TabsTrigger>
          <TabsTrigger value="external" className="h-10 min-h-10 whitespace-normal px-2 py-2 text-xs leading-tight sm:h-full sm:min-h-0 sm:px-3 sm:py-0 sm:text-sm">Theo nội dung tuyển dụng</TabsTrigger>
          <TabsTrigger value="job_fit" className="h-10 min-h-10 whitespace-normal px-2 py-2 text-xs leading-tight sm:h-full sm:min-h-0 sm:px-3 sm:py-0 sm:text-sm">Độ phù hợp việc làm</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={history.search} onChange={(event) => history.setSearch(event.target.value)} placeholder={history.type === 'job_fit' ? 'Tìm theo CV, việc làm hoặc công ty' : history.type === 'external' ? 'Tìm theo tên CV' : 'Tìm theo CV hoặc vị trí mục tiêu'} className="pl-9" /></label>
        <Combobox value={history.cvId} onChange={(value) => history.setCvId(String(value))} placeholder="Lọc theo CV..." searchPlaceholder="Tìm theo tên CV..." emptyMessage="Không tìm thấy CV" options={[{ value: 'all', label: 'Tất cả CV' }, ...history.cvs.map((cv) => ({ value: cv.id, label: cv.name }))]} className="w-full sm:w-64 sm:shrink-0 sm:basis-64" />
        <Select value={history.status} onValueChange={(value) => history.setStatus(value ?? 'all')} items={STATUS_OPTIONS}><SelectTrigger className="w-full border-border bg-background sm:w-44" aria-label="Lọc theo trạng thái"><SelectValue /></SelectTrigger><SelectContent>{STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>
      </div>
      {history.isLoading ? <ResearchHistorySkeleton /> : null}
      {!history.isLoading && !history.sessions.length && !history.jobFits.length && !history.externalResearches.length ? <EmptyResearchHistory /> : null}
      {history.sessions.length > 0 ? <div className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">{history.sessions.map((session) => <ResearchHistoryItem key={session.id} session={session} isRetrying={history.retryingSessionId === session.id} onRetry={() => history.retry(session.id)} />)}</div> : null}
      {history.jobFits.length > 0 ? <div className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">{history.jobFits.map((analysis) => <JobFitHistoryItem key={analysis.id} analysis={analysis} isRetrying={history.retryingJobFitId === analysis.id} onRetry={() => history.retryJobFit(analysis.id)} />)}</div> : null}
      {history.externalResearches.length > 0 ? <div className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">{history.externalResearches.map((research) => <ExternalJobResearchHistoryItem key={research.id} research={research} isRetrying={history.retryingExternalId === research.id} onRetry={() => history.retryExternal(research.id)} />)}</div> : null}
      {history.meta ? <DataPagination page={history.meta.page} totalPages={history.meta.total_pages} total={history.meta.total} onPageChange={history.setPage} /> : null}
    </section>
  </main>
}
