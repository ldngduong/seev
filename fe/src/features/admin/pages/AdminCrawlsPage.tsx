import { CalendarClock, Play, RefreshCw, RotateCcw, Trash2, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

import { DataPagination } from '@/shared/components/data/DataPagination'
import { Button } from '@/shared/components/ui/button'
import { Progress } from '@/shared/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { AdminPage } from '../components/admin-page'
import { useAdminCrawls } from '../hooks/use-admin-crawls'
import type { CrawlRun, QueueOverview } from '../types/admin.types'
import { describeCron } from '../utils/admin-formatters'

const statusLabels: Record<string, string> = {
  queued: 'Đang chờ', processing: 'Đang chạy', completed: 'Hoàn tất', partial_failed: 'Hoàn tất, có lỗi',
  failed: 'Thất bại', cancelled: 'Đã hủy', waiting: 'Đang chờ', delayed: 'Chờ đến lịch', active: 'Đang chạy', paused: 'Tạm dừng',
}

export function AdminCrawlsPage() {
  const state = useAdminCrawls()
  const active = state.runs.find((run) => ['queued', 'processing'].includes(run.status))
  const hasActiveQueueJob = state.queue?.jobs.some((job) => job.state === 'active') ?? false
  const manualJobs = state.queue?.jobs.filter((job) => !job.scheduled && job.state !== 'active') ?? []
  const automaticJobs = state.queue?.jobs.filter((job) => job.scheduled && job.state !== 'active') ?? []

  return <AdminPage title="Thu thập việc làm" description="Theo dõi tiến trình, lịch chạy và kết quả thu thập dữ liệu.">
    <Tabs value={state.type} onValueChange={(value) => state.setType(value as 'manual' | 'scheduled')} className="gap-5">
      <TabsList><TabsTrigger value="manual">Chạy thủ công</TabsTrigger><TabsTrigger value="scheduled">Lịch tự động</TabsTrigger></TabsList>
      <TabsContent value="manual" className="grid gap-5">
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={state.refresh}><RefreshCw />Làm mới</Button><Button onClick={() => state.trigger(false)} disabled={state.isTriggering || Boolean(active) || hasActiveQueueJob}><Play />Bắt đầu thu thập</Button>{active?.trigger_type === 'manual' ? <Button variant="destructive" disabled={state.isCancelling || active.cancel_requested} onClick={() => state.cancel(active.id)}>{active.cancel_requested || state.isCancelling ? 'Đang dừng...' : 'Dừng lượt chạy'}</Button> : null}</div>
        {active?.trigger_type === 'manual' ? <ActiveRun run={active} /> : <EmptyRun icon={Play} title="Không có lượt chạy thủ công" description="Bắt đầu một lượt mới để cập nhật kho việc làm." />}
        <QueueJobs title="Tác vụ đang chờ xử lý" jobs={manualJobs} onRemove={state.remove} />
        <RunHistory runs={state.runs} empty="Chưa có lịch sử chạy thủ công." />
      </TabsContent>
      <TabsContent value="scheduled" className="grid gap-5">
        {state.queue?.schedule.length ? <section className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,32rem),1fr))]">{state.queue.schedule.map((schedule) => <div key={schedule.key} className="flex w-full items-start gap-3 rounded-2xl border border-border/60 bg-card p-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarClock className="size-5" /></span><div><h2 className="font-semibold text-zinc-800">{describeCron(schedule.pattern)}</h2><p className="mt-1 text-sm text-muted-foreground">Lần chạy kế tiếp: {new Date(schedule.next).toLocaleString('vi-VN')}</p></div></div>)}</section> : <EmptyRun icon={CalendarClock} title="Chưa cấu hình lịch tự động" description="Thêm lịch chạy trong cấu hình backend để hệ thống tự cập nhật dữ liệu." />}
        {active?.trigger_type === 'scheduled' ? <ActiveRun run={active} /> : null}
        <QueueJobs title="Tác vụ tự động đang chờ" jobs={automaticJobs} onRemove={state.remove} />
        <RunHistory runs={state.runs} empty="Chưa có lịch sử chạy tự động." />
      </TabsContent>
    </Tabs>
    {state.meta ? <DataPagination page={state.meta.page} totalPages={state.meta.total_pages} total={state.meta.total} onPageChange={state.setPage} /> : null}
  </AdminPage>
}

function ActiveRun({ run }: { run: CrawlRun }) {
  return <section className="rounded-2xl border border-primary/25 bg-primary/5 p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-50" /><span className="relative inline-flex size-2 rounded-full bg-primary" /></span><h2 className="font-semibold text-zinc-800">Đang thu thập việc làm</h2></div><p className="mt-1 text-sm text-muted-foreground">{run.progress_message || 'Đang chuẩn bị...'}</p></div><strong className="text-sm tabular-nums text-primary">{run.progress}%</strong></div><Progress className="mt-4" value={run.progress} /><div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4"><RunMetric label="Mục đã xử lý" value={`${run.completed_targets}/${run.total_targets}`} /><RunMetric label="Việc làm tìm thấy" value={run.total_jobs} /><RunMetric label="Việc làm đã lưu" value={run.saved_jobs} /><RunMetric label="Mục bị lỗi" value={run.failed_targets} /></div>{run.current_source ? <p className="mt-3 text-xs text-muted-foreground">Đang xử lý {run.current_source} · {run.current_category}</p> : null}</section>
}

function RunMetric({ label, value }: { label: string; value: string | number }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold tabular-nums text-zinc-800">{value}</p></div> }

function EmptyRun({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) { return <section className="flex items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background text-muted-foreground"><Icon className="size-5" /></span><div><h2 className="font-medium text-zinc-700">{title}</h2><p className="mt-0.5 text-sm text-muted-foreground">{description}</p></div></section> }

function QueueJobs({ title, jobs, onRemove }: { title: string; jobs: QueueOverview['jobs']; onRemove: (id: string) => void }) {
  if (!jobs.length) return null
  return <section><h2 className="mb-3 font-semibold text-zinc-800">{title}</h2><div className="grid gap-2">{jobs.map((job) => <div key={job.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3"><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-zinc-600"><RotateCcw className="size-4" /></span><div className="min-w-0"><p className="text-sm font-medium text-zinc-800">{statusLabels[job.state] || 'Đang xử lý'}</p>{job.failed_reason ? <p className="mt-0.5 line-clamp-2 text-xs text-rose-600">{formatQueueError(job.failed_reason)}</p> : <p className="mt-0.5 text-xs text-muted-foreground">Tác vụ đang được hệ thống xử lý.</p>}</div></div>{['waiting', 'delayed', 'failed'].includes(job.state) ? <Button size="icon-sm" variant="ghost" aria-label="Gỡ tác vụ" onClick={() => onRemove(job.id)}><Trash2 /></Button> : null}</div>)}</div></section>
}

function RunHistory({ runs, empty }: { runs: CrawlRun[]; empty: string }) {
  return <section><h2 className="mb-3 font-semibold text-zinc-800">Lịch sử</h2>{runs.length ? <div className="overflow-hidden rounded-2xl border border-border/60 bg-card"><table className="w-full text-sm"><thead className="border-b border-border/60 text-left text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Thời gian</th><th className="px-4 py-3 font-medium">Trạng thái</th><th className="px-4 py-3 text-right font-medium">Mục đã xử lý</th><th className="px-4 py-3 text-right font-medium">Việc làm đã lưu</th></tr></thead><tbody className="divide-y divide-border/60">{runs.map((run) => <tr key={run.id} className="transition-colors hover:bg-muted/30"><td className="px-4 py-3"><Link className="font-medium text-zinc-800 hover:text-primary" to={`/admin/crawls/${run.id}`}>{new Date(run.created_at).toLocaleString('vi-VN')}</Link></td><td className="px-4 py-3"><span className={run.status === 'failed' ? 'text-rose-600' : run.status === 'completed' ? 'text-emerald-700' : 'text-zinc-600'}>{statusLabels[run.status] || 'Đang xử lý'}</span>{run.failed_targets ? <span className="ml-1 text-xs text-muted-foreground">({run.failed_targets} lỗi)</span> : null}</td><td className="px-4 py-3 text-right tabular-nums">{run.completed_targets}/{run.total_targets}</td><td className="px-4 py-3 text-right tabular-nums">{run.saved_jobs}</td></tr>)}</tbody></table></div> : <p className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">{empty}</p>}</section>
}

function formatQueueError(error: string) {
  if (error.includes('job started more than allowable limit')) return 'Tác vụ vượt quá số lần khởi động cho phép.'
  if (error.includes('Custom Id cannot contain')) return 'Mã tác vụ không hợp lệ.'
  return 'Tác vụ xử lý thất bại. Bạn có thể gỡ khỏi hàng chờ và chạy lại.'
}
