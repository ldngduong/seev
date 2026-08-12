import { ArrowUpRight, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router'

import { Progress } from '@/shared/components/ui/progress'
import type { UserDashboard } from '../types/dashboard.types'

const statusLabels = { queued: 'Đang chờ', processing: 'Đang phân tích', completed: 'Hoàn tất', failed: 'Bị lỗi' } as const

export function RecentResearches({ sessions }: { sessions: UserDashboard['recent_researches'] }) {
  return <section className="rounded-2xl border border-border/60 bg-card p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-zinc-800">Nghiên cứu gần đây</h2><p className="mt-1 text-sm text-muted-foreground">Tiếp tục phiên đang chạy hoặc xem lại kết quả.</p></div><Link to="/research-history" className="text-xs font-medium text-primary hover:underline">Xem tất cả</Link></div>
    {sessions.length ? <div className="mt-3 divide-y divide-border/60">{sessions.map((session) => <Link key={session.id} to={`/research-history/${session.id}`} className="flex items-center gap-3 py-3 transition first:pt-2 hover:bg-muted/20"><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${session.status === 'completed' ? 'bg-emerald-500/10 text-emerald-700' : session.status === 'failed' ? 'bg-rose-500/10 text-rose-600' : 'bg-primary/10 text-primary'}`}>{session.status === 'processing' || session.status === 'queued' ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowUpRight className="size-4" />}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-medium text-zinc-800">{session.job_category_name || (session.type === 'quick' ? 'Research nhanh' : 'Research tùy chỉnh')}</p><span className="shrink-0 text-xs text-muted-foreground">{new Date(session.created_at).toLocaleDateString('vi-VN')}</span></div><p className="mt-0.5 truncate text-xs text-muted-foreground">{statusLabels[session.status]}{session.seniority_level_name ? ` · ${session.seniority_level_name}` : ''}{session.status === 'completed' ? ` · ${session.suggestion_count} việc làm gợi ý` : ''}</p>{session.status === 'processing' || session.status === 'queued' ? <Progress className="mt-2 h-1" value={session.progress} /> : null}</div></Link>)}</div> : <div className="grid min-h-44 place-items-center text-center"><div><p className="text-sm font-medium text-zinc-700">Chưa có phiên nghiên cứu</p><Link className="mt-1 inline-block text-sm text-primary hover:underline" to="/research/new">Bắt đầu phiên đầu tiên</Link></div></div>}
  </section>
}
