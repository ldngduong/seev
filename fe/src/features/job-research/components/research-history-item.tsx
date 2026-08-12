import { Clock3 } from 'lucide-react'
import { Link } from 'react-router'

import type { CvResearchSession } from '@/entities/cv/types/cv.types'
import { Badge } from '@/shared/components/ui/badge'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Progress } from '@/shared/components/ui/progress'
import { cn } from '@/shared/lib/utils'
import { formatResearchDateTime, researchStatusLabel, researchStatusVariant } from '@/features/job-research/utils/research-history.utils'

export function ResearchHistoryItem({ session, isRetrying, onRetry }: {
  session: CvResearchSession
  isRetrying: boolean
  onRetry: () => void
}) {
  const target = session.target.target_role || [session.target.seniority_level_name, session.target.job_category_name].filter(Boolean).join(' ')
  return (
    <article className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/40 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={researchStatusVariant(session.status)}>{researchStatusLabel(session.status)}</Badge>
          <Badge variant="outline">{session.type === 'quick' ? 'Nhanh' : 'Tùy chỉnh'}</Badge>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" />{formatResearchDateTime(session.created_at)}</span>
        </div>
        <div><h2 className="break-words text-base font-semibold text-zinc-700 sm:text-lg">{target || 'Đang nghiên cứu định hướng CV'}</h2><p className="mt-1 break-all text-sm text-muted-foreground">{session.cv.name}</p></div>
        {['queued', 'processing'].includes(session.status) ? <div className="max-w-xl space-y-2"><Progress value={session.progress} /><p className="text-xs text-muted-foreground">{session.progress_message}</p></div> : <div className="flex flex-wrap gap-2">{session.audit?.suggested_keywords.slice(0, 8).map((keyword) => <Badge key={keyword} variant="outline">{keyword}</Badge>)}</div>}
        {session.status === 'failed' ? <p className="text-sm text-destructive">{session.error}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm lg:min-w-56 lg:shrink-0 lg:justify-end">
        <span><span className="text-muted-foreground">Điểm </span><strong>{session.audit?.overall_score ?? '-'}</strong></span>
        <span><span className="text-muted-foreground">Việc </span><strong>{session.job_suggestions.length}</strong></span>
        <Link to={`/research-history/${session.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>Xem chi tiết</Link>
        {session.status === 'failed' ? <Button type="button" size="sm" onClick={onRetry} disabled={isRetrying}>{isRetrying ? 'Đang thử lại...' : 'Thử lại'}</Button> : null}
      </div>
    </article>
  )
}
