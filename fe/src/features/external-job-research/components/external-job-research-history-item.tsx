import { Clock3, ExternalLink, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router'

import { Badge } from '@/shared/components/ui/badge'
import { buttonVariants } from '@/shared/components/ui/button'
import { Progress } from '@/shared/components/ui/progress'
import { cn } from '@/shared/lib/utils'
import type { ExternalJobResearch } from '../types/external-job-research.types'

const labels = { queued: 'Đang chờ', processing: 'Đang phân tích', completed: 'Hoàn tất', failed: 'Thất bại' }
export function ExternalJobResearchHistoryItem({ research, onRetry, isRetrying }: { research: ExternalJobResearch; onRetry: () => void; isRetrying: boolean }) {
  const active = research.status === 'queued' || research.status === 'processing'
  return <article className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/40 lg:flex-row lg:items-center lg:justify-between">
    <div className="min-w-0 flex-1 space-y-3"><div className="flex flex-wrap items-center gap-2"><Badge variant={research.status === 'failed' ? 'destructive' : research.status === 'completed' ? 'default' : 'secondary'}>{active ? <LoaderCircle className="animate-spin" /> : null}{labels[research.status]}</Badge><Badge variant="outline">{research.source_kind === 'link' ? 'Liên kết tuyển dụng' : 'JD'}</Badge><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" />{new Date(research.created_at).toLocaleString('vi-VN')}</span></div><div><h2 className="text-lg font-semibold text-zinc-700">Đánh giá theo {research.source_kind === 'link' ? 'liên kết tuyển dụng' : 'JD'}</h2><p className="mt-1 text-sm text-muted-foreground">{research.cv?.name ?? 'CV đã chọn'}</p></div>{active ? <div className="max-w-xl space-y-2"><Progress value={research.progress} /><p className="text-xs text-muted-foreground">{research.progress_message}</p></div> : null}{research.status === 'failed' ? <p className="text-sm text-destructive">{research.progress_message}</p> : null}</div>
    <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:gap-4">{research.score !== null ? <span className="text-sm"><span className="text-muted-foreground">Điểm </span><strong>{research.score}</strong></span> : null}{research.status === 'failed' && research.can_retry ? <button type="button" className={cn(buttonVariants({ size: 'sm' }))} onClick={onRetry} disabled={isRetrying}>{isRetrying ? 'Đang thử lại...' : 'Thử lại'}</button> : null}<Link to={`/research-history/external/${research.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>{active ? 'Xem tiến trình' : 'Xem chi tiết'}<ExternalLink /></Link></div>
  </article>
}
