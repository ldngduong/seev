import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

import { Progress } from '@/shared/components/ui/progress'
import { AdminPage, MetricCard } from '../components/admin-page'
import { useAdminCrawlDetail } from '../hooks/use-admin-crawl-detail'

const statusLabels: Record<string, string> = { queued: 'Đang chờ', processing: 'Đang chạy', completed: 'Hoàn tất', partial_failed: 'Hoàn tất, có lỗi', failed: 'Thất bại', cancelled: 'Đã hủy' }

export function AdminCrawlDetailPage() {
  const state = useAdminCrawlDetail()
  const run = state.run
  if (!run) return <AdminPage title={state.isLoading ? 'Đang tải lượt thu thập...' : 'Không tìm thấy lượt thu thập'}><span /></AdminPage>
  return <AdminPage title={run.trigger_type === 'manual' ? 'Lượt chạy thủ công' : 'Lượt chạy tự động'} description={new Date(run.created_at).toLocaleString('vi-VN')} actions={<Link className="inline-flex items-center gap-1.5 text-sm font-medium text-primary" to="/admin/crawls"><ArrowLeft className="size-4" />Quay lại</Link>}>
    <section className="rounded-2xl border border-border/60 bg-card p-5"><div className="flex justify-between gap-4"><div><strong className="text-zinc-800">{statusLabels[run.status] || 'Đang xử lý'}</strong><p className="mt-1 text-sm text-muted-foreground">{run.progress_message}</p></div><strong className="text-sm tabular-nums text-primary">{run.progress}%</strong></div><Progress className="mt-4" value={run.progress} /></section>
    <section className="grid gap-3 sm:grid-cols-4"><MetricCard label="Mục hoàn tất" value={`${run.completed_targets}/${run.total_targets}`} /><MetricCard label="Mục bị lỗi" value={run.failed_targets} /><MetricCard label="Việc làm tìm thấy" value={run.total_jobs} /><MetricCard label="Việc làm đã lưu" value={run.saved_jobs} /></section>
    <section><h2 className="mb-3 font-semibold text-zinc-800">Chi tiết từng nguồn</h2><div className="overflow-hidden rounded-2xl border border-border/60 bg-card"><table className="w-full text-sm"><thead className="border-b border-border/60 text-left text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Nguồn và chuyên môn</th><th className="px-4 py-3 font-medium">Trạng thái</th><th className="px-4 py-3 text-right font-medium">Tìm thấy</th><th className="px-4 py-3 text-right font-medium">Đã lưu</th><th className="px-4 py-3 text-right font-medium">Thời gian</th></tr></thead><tbody className="divide-y divide-border/60">{run.items.map((item) => <tr key={item.id} className="align-top transition-colors hover:bg-muted/30"><td className="px-4 py-3"><strong className="text-zinc-800">{item.source}</strong><p className="mt-0.5 text-xs text-muted-foreground">{item.category_names}</p>{item.error ? <p className="mt-1 text-xs text-rose-600">Không thể thu thập từ nguồn này.</p> : null}</td><td className="px-4 py-3">{statusLabels[item.status] || 'Đang xử lý'}</td><td className="px-4 py-3 text-right tabular-nums">{item.fetched_count}</td><td className="px-4 py-3 text-right tabular-nums">{item.saved_count}</td><td className="px-4 py-3 text-right tabular-nums">{item.duration_ms ? `${(item.duration_ms / 1000).toFixed(1)} giây` : '—'}</td></tr>)}</tbody></table></div></section>
  </AdminPage>
}
