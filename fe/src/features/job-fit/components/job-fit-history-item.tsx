import { Clock3, ExternalLink, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router'

import { Badge } from '@/shared/components/ui/badge'
import { buttonVariants } from '@/shared/components/ui/button'
import { Progress } from '@/shared/components/ui/progress'
import { cn } from '@/shared/lib/utils'
import type { JobFitAnalysis } from '../types/job-fit.types'

const statusLabels = { queued: 'Đang chờ', processing: 'Đang phân tích', completed: 'Hoàn tất', failed: 'Thất bại' }
const verdictLabels: Record<string, string> = { very_good: 'Rất phù hợp', good: 'Phù hợp', consider: 'Nên cân nhắc', low: 'Ít phù hợp' }

export function JobFitHistoryItem({ analysis, isRetrying = false, onRetry }: { analysis: JobFitAnalysis; isRetrying?: boolean; onRetry?: () => void }) {
  const active = analysis.status === 'queued' || analysis.status === 'processing'
  return (
    <article className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/40 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={analysis.status === 'failed' ? 'destructive' : analysis.status === 'completed' ? 'default' : 'secondary'}>{active ? <LoaderCircle className="animate-spin" /> : null}{statusLabels[analysis.status]}</Badge>
          <Badge variant="outline">Độ phù hợp việc làm</Badge>
          {analysis.job.is_expired ? <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">Việc làm đã hết hạn</Badge> : null}
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" />{new Date(analysis.created_at).toLocaleString('vi-VN')}</span>
        </div>
        <div><h2 className="truncate text-lg font-semibold text-zinc-700">{analysis.job.title}</h2><p className="mt-1 truncate text-sm text-muted-foreground">{analysis.job.company_name || 'Chưa cập nhật công ty'} · {analysis.job.source}</p></div>
        {active ? <div className="max-w-xl space-y-2"><Progress value={analysis.progress} /><p className="text-xs text-muted-foreground">{analysis.progress_message}</p></div> : null}
        {analysis.status === 'failed' ? <p className="text-sm text-destructive">Không thể hoàn tất đánh giá. Credit đã được hoàn lại.</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-5 text-sm lg:min-w-72 lg:justify-end">
        <span><span className="text-muted-foreground">Điểm </span><strong>{analysis.score ?? '—'}</strong></span>
        {analysis.verdict ? <span className="font-medium text-primary">{verdictLabels[analysis.verdict] ?? analysis.verdict}</span> : null}
        {analysis.status === 'failed' && onRetry ? <button type="button" className={cn(buttonVariants({ size: 'sm' }))} onClick={onRetry} disabled={isRetrying || analysis.job.is_expired}>{isRetrying ? 'Đang thử lại...' : 'Thử lại'}</button> : null}
        <Link to={`/jobs/${analysis.job_post_id}/fit/${analysis.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>{active ? 'Xem tiến trình' : 'Xem chi tiết'}<ExternalLink /></Link>
      </div>
    </article>
  )
}
