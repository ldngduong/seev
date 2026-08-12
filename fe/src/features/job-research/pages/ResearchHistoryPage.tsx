import { FileText, RefreshCw, Search } from 'lucide-react'
import { Link } from 'react-router'

import { DataPagination } from '@/shared/components/data/DataPagination'
import { DashboardPageHeader } from '@/shared/components/layouts/DashboardPageHeader'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Combobox } from '@/shared/components/ui/combobox'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { ResearchHistoryItem } from '@/features/job-research/components/research-history-item'
import { EmptyResearchHistory, ResearchHistorySkeleton } from '@/features/job-research/components/research-history-states'
import { useResearchHistory } from '@/features/job-research/hooks/use-research-history'
import { cn } from '@/shared/lib/utils'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' }, { value: 'queued', label: 'Đang chờ' },
  { value: 'processing', label: 'Đang xử lý' }, { value: 'completed', label: 'Hoàn tất' },
  { value: 'failed', label: 'Thất bại' },
]
const TYPE_OPTIONS = [
  { value: 'all', label: 'Tất cả loại' }, { value: 'quick', label: 'Research nhanh' },
  { value: 'custom', label: 'Research tùy chỉnh' },
]

export function ResearchHistoryPage() {
  const history = useResearchHistory()
  return <main className="flex w-full flex-col gap-5">
    <DashboardPageHeader title="Lịch sử research" actions={<><Button type="button" variant="outline" onClick={history.refresh} disabled={history.isRefreshing}><RefreshCw />Làm mới</Button><Link to="/research/new" className={cn(buttonVariants())}><FileText />Research mới</Link></>} />
    <section className="grid gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={history.search} onChange={(event) => history.setSearch(event.target.value)} placeholder="Tìm theo CV hoặc vị trí mục tiêu" className="pl-9" /></label>
        <Combobox value={history.cvId} onChange={(value) => history.setCvId(String(value))} placeholder="Lọc theo CV..." searchPlaceholder="Tìm theo tên CV..." emptyMessage="Không tìm thấy CV" options={[{ value: 'all', label: 'Tất cả CV' }, ...history.cvs.map((cv) => ({ value: cv.id, label: cv.name }))]} className="w-full sm:w-64 sm:shrink-0 sm:basis-64" />
        <Select value={history.status} onValueChange={(value) => history.setStatus(value ?? 'all')} items={STATUS_OPTIONS}><SelectTrigger className="w-full border-border bg-background sm:w-44" aria-label="Lọc theo trạng thái"><SelectValue /></SelectTrigger><SelectContent>{STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>
        <Select value={history.type} onValueChange={(value) => history.setType(value ?? 'all')} items={TYPE_OPTIONS}><SelectTrigger className="w-full border-border bg-background sm:w-52" aria-label="Lọc theo loại research"><SelectValue /></SelectTrigger><SelectContent>{TYPE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>
      </div>
      {history.isLoading ? <ResearchHistorySkeleton /> : null}
      {history.isError ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Không tải được lịch sử research.</div> : null}
      {!history.isLoading && !history.sessions.length ? <EmptyResearchHistory /> : null}
      {history.sessions.length > 0 ? <div className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">{history.sessions.map((session) => <ResearchHistoryItem key={session.id} session={session} isRetrying={history.retryingSessionId === session.id} onRetry={() => history.retry(session.id)} />)}</div> : null}
      {history.meta ? <DataPagination page={history.meta.page} totalPages={history.meta.total_pages} total={history.meta.total} onPageChange={history.setPage} /> : null}
    </section>
  </main>
}
