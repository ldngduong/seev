import { History } from 'lucide-react'
import { Link } from 'react-router'

import { DataPagination } from '@/shared/components/data/DataPagination'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Progress } from '@/shared/components/ui/progress'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { CvResearchSession, UserCv } from '@/entities/cv/types/cv.types'
import { formatDateTime, formatResearchTarget, getResearchStatusVariant } from '@/features/cv-library/utils/cv-library.utils'

const SESSION_STATUS_LABELS: Record<CvResearchSession['status'], string> = { queued: 'Đang chờ', processing: 'Đang xử lý', completed: 'Hoàn tất', failed: 'Thất bại' }
const SESSION_TYPE_LABELS: Record<CvResearchSession['type'], string> = { quick: 'Research nhanh', custom: 'Research tùy chỉnh' }

export function CvInfoPanel({ cv }: { cv: UserCv }) {
  const rows = [
    ['Tên hiển thị', cv.name], ['File gốc', cv.original_file_name], ['Định dạng', cv.mime_type],
    ['Số trang', `${cv.total_pages}`], ['Dung lượng', `${Math.round(cv.size_bytes / 1024)} KB`],
    ['Ngày upload', formatDateTime(cv.created_at)], ['Cập nhật', formatDateTime(cv.updated_at)],
  ]
  return <Card className="rounded-2xl shadow-none"><CardHeader><CardTitle className="text-base font-semibold text-zinc-700">Thông tin CV</CardTitle></CardHeader><CardContent className="grid gap-3">{rows.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0"><span className="text-sm text-muted-foreground">{label}</span><span className="min-w-0 text-right text-sm font-medium">{value}</span></div>)}</CardContent></Card>
}

export function CvResearchHistoryPanel({ sessions, isLoading, page, totalPages, total, onPageChange }: {
  sessions: CvResearchSession[]; isLoading: boolean; page: number; totalPages: number; total: number; onPageChange: (page: number) => void
}) {
  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}</div>
  return <div className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card">
    <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3"><History className="size-4 text-muted-foreground" /><span className="text-sm font-medium text-zinc-700">Lịch sử research</span></div>
    {sessions.length === 0 ? <p className="px-4 py-6 text-sm text-muted-foreground">CV này chưa có research nào.</p> : <div className="flex flex-col divide-y divide-border/60">{sessions.map((session) => <Link key={session.id} to={`/research-history/${session.id}`} className="block px-4 py-4 transition-colors hover:bg-muted/40"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant={getResearchStatusVariant(session.status)}>{SESSION_STATUS_LABELS[session.status]}</Badge><Badge variant="outline">{SESSION_TYPE_LABELS[session.type]}</Badge></div><h2 className="mt-3 truncate font-semibold text-zinc-700">{formatResearchTarget(session)}</h2><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(session.created_at)}</p>{['queued', 'processing'].includes(session.status) ? <div className="mt-3 space-y-2"><Progress value={session.progress} /><p className="text-xs text-muted-foreground">{session.progress_message}</p></div> : null}{session.status === 'failed' ? <p className="mt-3 line-clamp-2 text-xs text-destructive">{session.error}</p> : null}</div><div className="text-right"><p className="text-2xl font-semibold text-zinc-700">{session.audit?.overall_score ?? '-'}</p><p className="text-xs text-muted-foreground">điểm</p></div></div></Link>)}</div>}
    {totalPages > 1 ? <div className="border-t border-border/60 px-4 py-3"><DataPagination page={page} totalPages={totalPages} total={total} onPageChange={onPageChange} /></div> : null}
  </div>
}

export function CvDetailSkeleton() {
  return <main className="flex w-full flex-col gap-6"><Skeleton className="h-24 rounded-md" /><section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]"><Skeleton className="h-[720px] rounded-md" /><Skeleton className="h-[360px] rounded-md" /></section></main>
}
