import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react'
import { Link } from 'react-router'

import type { AdminDashboard } from '../types/admin.types'

const labels: Record<string, string> = { queued: 'Đang chờ', processing: 'Đang chạy', completed: 'Hoàn tất', partial_failed: 'Hoàn tất, có lỗi', failed: 'Thất bại', cancelled: 'Đã hủy' }

export function LatestCrawlSummary({ run }: { run: AdminDashboard['latest_crawl'] }) {
  const Icon = !run || run.status === 'failed' || run.status === 'partial_failed' ? AlertTriangle : run.status === 'completed' ? CheckCircle2 : Clock3
  return <article className="rounded-2xl border border-border/60 bg-card p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-zinc-800">Thu thập dữ liệu gần nhất</h2><p className="mt-1 text-sm text-muted-foreground">Sức khỏe kho việc làm.</p></div><span className={`grid size-9 place-items-center rounded-xl ${run?.status === 'completed' ? 'bg-emerald-500/10 text-emerald-700' : run && ['queued', 'processing'].includes(run.status) ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-700'}`}><Icon className="size-4" /></span></div>{run ? <div className="mt-5"><div className="flex items-end justify-between"><div><p className="text-sm font-medium text-zinc-800">{labels[run.status] || 'Đang xử lý'}</p><p className="mt-1 text-xs text-muted-foreground">{run.trigger_type === 'manual' ? 'Chạy thủ công' : 'Lịch tự động'} · {new Date(run.created_at).toLocaleString('vi-VN')}</p></div><p className="text-2xl font-semibold tabular-nums text-zinc-800">{run.saved_jobs}</p></div><p className="mt-1 text-right text-xs text-muted-foreground">việc làm đã lưu</p>{run.failed_targets ? <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700">{run.failed_targets} mục cần kiểm tra lại.</p> : null}<Link to={`/admin/crawls/${run.id}`} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">Xem chi tiết</Link></div> : <p className="grid min-h-40 place-items-center text-sm text-muted-foreground">Chưa có lượt thu thập dữ liệu.</p>}</article>
}
